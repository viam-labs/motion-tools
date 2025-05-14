export const usePersistentUUIDs = () => {
    const uuids = new Map();
    const updateUUIDs = (objects) => {
        if (uuids.size === 0) {
            for (const object of objects) {
                uuids.set(object.name, object.uuid);
            }
        }
        for (const object of objects) {
            object.uuid = uuids.get(object.name) ?? object.uuid;
        }
    };
    return { uuids, updateUUIDs };
};
