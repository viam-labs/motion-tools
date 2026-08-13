package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
	"github.com/viam-labs/motion-tools/draw"
	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	"github.com/viam-labs/motion-tools/worldstate"
	commonpb "go.viam.com/api/common/v1"
	pb "go.viam.com/api/service/worldstatestore/v1"
	"go.viam.com/rdk/logging"
	"go.viam.com/rdk/resource"
	"go.viam.com/rdk/services/worldstatestore"
)

// streamBufferSize bounds how far a StreamTransformChanges consumer may fall behind. The stream
// is incremental, so dropping a change corrupts it permanently; end the stream instead.
const streamBufferSize = 4096

// ErrTransformNotFound is returned when GetTransform names a UUID the world does not hold.
var ErrTransformNotFound = errors.New("no transform with that uuid")

// Config configures the visualization module.
type Config struct {
	// TempDir buffers chunked entity payloads. Never point it at a directory holding anything
	// else: the draw service clears stale files there at startup.
	TempDir string `json:"temp_dir,omitempty"`
}

// Validate implements resource.ConfigValidator. Every field has a usable default.
func (conf *Config) Validate(string) ([]string, []string, error) {
	return nil, nil, nil
}

func defaultTempDir() string {
	return filepath.Join(os.TempDir(), "viam-visualization")
}

// projectedEntity is one draw entity as it appears over the world_state_store API. The kind is
// kept because a bulk clear names a scope rather than individual UUIDs.
type projectedEntity struct {
	transform *commonpb.Transform
	drawing   bool
}

// Store serves the draw API's scene over the world_state_store API.
//
// Writes land in an in-process draw.DrawService; a worker follows its stream, projects each
// Drawing onto a Transform, and publishes the result to StreamTransformChanges.
type Store struct {
	resource.Named
	resource.TriviallyReconfigurable

	logger   logging.Logger
	svc      *draw.DrawService
	commands map[string]commandHandler

	streamCtx context.Context
	cancel    context.CancelFunc
	workers   sync.WaitGroup

	mu       sync.RWMutex
	entities map[string]projectedEntity

	subsMu sync.Mutex
	subs   map[chan worldstatestore.TransformChange]struct{}
}

var _ worldstatestore.Service = (*Store)(nil)

func newStore(
	_ context.Context,
	_ resource.Dependencies,
	conf resource.Config,
	logger logging.Logger,
) (worldstatestore.Service, error) {
	newConf, err := resource.NativeConfig[*Config](conf)
	if err != nil {
		return nil, err
	}

	tempDir := newConf.TempDir
	if tempDir == "" {
		tempDir = defaultTempDir()
	}

	streamCtx, cancel := context.WithCancel(context.Background())

	store := &Store{
		Named:     conf.ResourceName().AsNamed(),
		logger:    logger,
		svc:       draw.NewDrawService(tempDir),
		streamCtx: streamCtx,
		cancel:    cancel,
		entities:  map[string]projectedEntity{},
		subs:      map[chan worldstatestore.TransformChange]struct{}{},
	}
	store.commands = store.newCommands()

	store.workers.Add(1)
	go func() {
		defer store.workers.Done()
		store.follow()
	}()

	return store, nil
}

// ListUUIDs returns the UUID of every entity currently in the world.
func (s *Store) ListUUIDs(_ context.Context, _ map[string]any) ([][]byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	uuids := make([][]byte, 0, len(s.entities))
	for _, entity := range s.entities {
		uuids = append(uuids, entity.transform.GetUuid())
	}

	return uuids, nil
}

// GetTransform returns one entity, already projected.
func (s *Store) GetTransform(_ context.Context, raw []byte, _ map[string]any) (*commonpb.Transform, error) {
	key, err := uuidKey(raw)
	if err != nil {
		return nil, err
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	entity, ok := s.entities[key]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrTransformNotFound, key)
	}

	return entity.transform, nil
}

// StreamTransformChanges follows the world until ctx is cancelled. It must return promptly and
// must not fail: RDK's client consumes a message as soon as the stream opens, to surface errors.
func (s *Store) StreamTransformChanges(
	ctx context.Context,
	_ map[string]any,
) (*worldstatestore.TransformChangeStream, error) {
	// No primer message here; RDK's own service server already sends one.
	changes := make(chan worldstatestore.TransformChange, streamBufferSize)

	s.subsMu.Lock()
	s.subs[changes] = struct{}{}
	s.subsMu.Unlock()

	go func() {
		<-ctx.Done()
		s.unsubscribe(changes)
	}()

	return worldstatestore.NewTransformChangeStreamFromChannel(ctx, changes), nil
}

// Close stops following the draw service and ends every open stream.
func (s *Store) Close(_ context.Context) error {
	s.cancel()
	s.workers.Wait()

	s.subsMu.Lock()
	for changes := range s.subs {
		delete(s.subs, changes)
		close(changes)
	}
	s.subsMu.Unlock()

	return nil
}

// follow projects the draw service's entity stream onto transforms until the store closes.
func (s *Store) follow() {
	for {
		subscription := s.svc.SubscribeEntities()
		err := s.drain(subscription)
		subscription.Close()

		if !errors.Is(err, draw.ErrSubscriberOverflow) {
			return
		}

		// Draining does no I/O, so falling behind means a bug rather than a slow consumer.
		// Drop the projected world and let the new subscription's replay rebuild it.
		s.logger.Error("draw entity subscription overflowed; rebuilding the world")
		s.clearScope(drawv1.EntityScope_ENTITY_SCOPE_ALL)
	}
}

func (s *Store) drain(subscription *draw.EntitySubscription) error {
	for {
		msgs, err := subscription.Next(s.streamCtx)
		if err != nil {
			return err
		}

		for _, msg := range msgs {
			s.apply(msg)
		}
	}
}

// apply folds one draw change into the projected world and publishes it.
func (s *Store) apply(msg *drawv1.StreamEntityChangesResponse) {
	if scope := msg.GetClearedScope(); scope != drawv1.EntityScope_ENTITY_SCOPE_UNSPECIFIED {
		s.clearScope(scope)
		return
	}

	transform, isDrawing, err := projectEntity(msg)
	if err != nil {
		s.logger.Errorw("projecting draw entity", "error", err)
		return
	}
	if transform == nil {
		return
	}

	key, err := uuidKey(transform.GetUuid())
	if err != nil {
		s.logger.Errorw("draw entity has an unusable uuid", "error", err)
		return
	}

	if msg.GetChangeType() == drawv1.EntityChangeType_ENTITY_CHANGE_TYPE_REMOVED {
		s.remove(key)
		return
	}

	paths := msg.GetUpdatedFields().GetPaths()
	if isDrawing {
		paths = worldstate.ProjectFieldMask(paths)
	}

	s.mu.Lock()
	s.entities[key] = projectedEntity{transform: transform, drawing: isDrawing}
	s.mu.Unlock()

	s.emit(worldstatestore.TransformChange{
		ChangeType:    changeType(msg.GetChangeType()),
		Transform:     transform,
		UpdatedFields: paths,
	})
}

// clearScope expands a draw bulk removal into one REMOVED per entity. The world_state_store
// API has no bulk signal, so clearing a large scene necessarily fans out.
func (s *Store) clearScope(scope drawv1.EntityScope) {
	s.mu.RLock()
	keys := make([]string, 0, len(s.entities))
	for key, entity := range s.entities {
		if clears(scope, entity.drawing) {
			keys = append(keys, key)
		}
	}
	s.mu.RUnlock()

	for _, key := range keys {
		s.remove(key)
	}
}

func (s *Store) remove(key string) {
	s.mu.Lock()
	entity, ok := s.entities[key]
	delete(s.entities, key)
	s.mu.Unlock()

	if !ok {
		return
	}

	s.emit(worldstatestore.TransformChange{
		ChangeType: pb.TransformChangeType_TRANSFORM_CHANGE_TYPE_REMOVED,
		Transform:  &commonpb.Transform{Uuid: entity.transform.GetUuid()},
	})
}

func (s *Store) emit(change worldstatestore.TransformChange) {
	s.subsMu.Lock()
	defer s.subsMu.Unlock()

	for changes := range s.subs {
		select {
		case changes <- change:
		default:
			s.logger.Warn("world state subscriber fell behind; closing its stream for resync")
			delete(s.subs, changes)
			close(changes)
		}
	}
}

func (s *Store) unsubscribe(changes chan worldstatestore.TransformChange) {
	s.subsMu.Lock()
	defer s.subsMu.Unlock()

	if _, ok := s.subs[changes]; !ok {
		return
	}
	delete(s.subs, changes)
	close(changes)
}

// projectEntity renders a stream message's entity as a Transform. Transforms pass through;
// Drawings are projected, since world_state_store carries no Shape of its own.
func projectEntity(msg *drawv1.StreamEntityChangesResponse) (*commonpb.Transform, bool, error) {
	switch entity := msg.GetEntity().(type) {
	case *drawv1.StreamEntityChangesResponse_Transform:
		return entity.Transform, false, nil
	case *drawv1.StreamEntityChangesResponse_Drawing:
		transform, err := worldstate.ProjectDrawing(entity.Drawing)
		return transform, true, err
	default:
		return nil, false, nil
	}
}

func changeType(source drawv1.EntityChangeType) pb.TransformChangeType {
	switch source {
	case drawv1.EntityChangeType_ENTITY_CHANGE_TYPE_ADDED:
		return pb.TransformChangeType_TRANSFORM_CHANGE_TYPE_ADDED
	case drawv1.EntityChangeType_ENTITY_CHANGE_TYPE_UPDATED:
		return pb.TransformChangeType_TRANSFORM_CHANGE_TYPE_UPDATED
	case drawv1.EntityChangeType_ENTITY_CHANGE_TYPE_REMOVED:
		return pb.TransformChangeType_TRANSFORM_CHANGE_TYPE_REMOVED
	default:
		return pb.TransformChangeType_TRANSFORM_CHANGE_TYPE_UNSPECIFIED
	}
}

func clears(scope drawv1.EntityScope, drawing bool) bool {
	switch scope {
	case drawv1.EntityScope_ENTITY_SCOPE_ALL:
		return true
	case drawv1.EntityScope_ENTITY_SCOPE_DRAWINGS:
		return drawing
	case drawv1.EntityScope_ENTITY_SCOPE_TRANSFORMS:
		return !drawing
	default:
		return false
	}
}

// uuidKey formats raw UUID bytes as the canonical 36-character string, which is what the
// visualizer sends back in get_entity_chunk requests.
func uuidKey(raw []byte) (string, error) {
	parsed, err := uuid.FromBytes(raw)
	if err != nil {
		return "", fmt.Errorf("parsing uuid: %w", err)
	}

	return parsed.String(), nil
}
