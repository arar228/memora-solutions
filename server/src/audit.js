import { db, uid, now } from './db.js';

const insert = db.prepare(
  `INSERT INTO audit_log (id, entity, entity_id, actor_id, action, before, after, created_at)
   VALUES (@id, @entity, @entity_id, @actor_id, @action, @before, @after, @created_at)`
);

// Append an audit entry (TZ §8.1). `before`/`after` are JSON-stringified.
export function audit({ entity, entityId, actorId, action, before = null, after = null }) {
  insert.run({
    id: uid('aud'),
    entity,
    entity_id: entityId,
    actor_id: actorId || null,
    action,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
    created_at: now(),
  });
}
