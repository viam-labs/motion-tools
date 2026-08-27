package draw

import (
	"context"
	"errors"
	"io"
	"sync"

	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
)

// ErrSubscriberOverflow reports that a subscription fell too far behind. The stream is
// incremental, so the backlog cannot be salvaged; resubscribe for a fresh replay.
var ErrSubscriberOverflow = errors.New("entity change queue overflow; reconnect for a fresh snapshot")

// EntitySubscription is a transport-independent view of the entity change stream, so a consumer
// outside this package can follow the scene without going through Connect-RPC.
type EntitySubscription struct {
	svc    *DrawService
	id     uint64
	sub    *entitySubscriber
	replay []*drawv1.StreamEntityChangesResponse

	closeOnce sync.Once
}

// SubscribeEntities registers a subscriber against the current world. Callers must Close it: an
// abandoned subscription queues changes nobody drains until it overflows.
func (svc *DrawService) SubscribeEntities() *EntitySubscription {
	// One lock covers the snapshot and the registration, so no change can slip between them.
	svc.mu.Lock()
	defer svc.mu.Unlock()

	id, sub := svc.addEntitySub()

	replay := make([]*drawv1.StreamEntityChangesResponse, 0, len(svc.entities))
	for entityID, entity := range svc.entities {
		switch entity.kind {
		case entityKindTransform:
			replay = append(replay, &drawv1.StreamEntityChangesResponse{
				ChangeType: drawv1.EntityChangeType_ENTITY_CHANGE_TYPE_ADDED,
				Entity:     &drawv1.StreamEntityChangesResponse_Transform{Transform: entity.transform},
			})
		case entityKindDrawing:
			if chunked, ok := svc.chunked[entityID]; ok {
				if msg := svc.buildChunkedReplayMsg(chunked); msg != nil {
					replay = append(replay, msg)
				}
			} else {
				replay = append(replay, &drawv1.StreamEntityChangesResponse{
					ChangeType: drawv1.EntityChangeType_ENTITY_CHANGE_TYPE_ADDED,
					Entity:     &drawv1.StreamEntityChangesResponse_Drawing{Drawing: entity.drawing},
				})
			}
		}
	}

	return &EntitySubscription{svc: svc, id: id, sub: sub, replay: replay}
}

// Next blocks for the next batch of changes: the world replayed as ADDED events on the first
// call, live changes after.
//
// Returns io.EOF when closed or cancelled, ErrSubscriberOverflow when the consumer fell behind.
func (subscription *EntitySubscription) Next(
	ctx context.Context,
) ([]*drawv1.StreamEntityChangesResponse, error) {
	if len(subscription.replay) > 0 {
		replay := subscription.replay
		subscription.replay = nil
		return replay, nil
	}

	for {
		msgs, overflow, closed := subscription.sub.take()
		if overflow {
			return nil, ErrSubscriberOverflow
		}
		if len(msgs) > 0 {
			return msgs, nil
		}
		if closed {
			return nil, io.EOF
		}

		select {
		case <-ctx.Done():
			return nil, io.EOF
		case <-subscription.sub.notify:
		}
	}
}

// Close unregisters the subscription. Safe to call more than once.
func (subscription *EntitySubscription) Close() {
	subscription.closeOnce.Do(func() {
		subscription.svc.mu.Lock()
		subscription.svc.removeEntitySub(subscription.id)
		subscription.svc.mu.Unlock()
	})
}
