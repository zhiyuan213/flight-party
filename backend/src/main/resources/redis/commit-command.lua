-- KEYS: match hash, command receipt hash, shard stream, shard due sorted set.
-- All keys must share the shard hash tag. Caller validates rules before invoking.
-- ARGV: expected version, request hash, next snapshot, response, event type,
-- event payload, match id, due timestamp (empty removes due).
local function keytype(key)
  return redis.call('TYPE', key).ok
end
local expected = tonumber(ARGV[1])
local due = ARGV[8] ~= '' and tonumber(ARGV[8]) or nil
if not expected or expected < 0 or expected ~= math.floor(expected) or expected >= 9007199254740991
    or ARGV[2] == '' or ARGV[3] == '' or ARGV[5] == '' or ARGV[7] == ''
    or (ARGV[8] ~= '' and (not due or due < 0 or due ~= math.floor(due))) then
  return {'INVALID_ARGUMENT'}
end
if keytype(KEYS[1]) ~= 'hash' or (keytype(KEYS[2]) ~= 'none' and keytype(KEYS[2]) ~= 'hash')
    or (keytype(KEYS[3]) ~= 'none' and keytype(KEYS[3]) ~= 'stream')
    or (keytype(KEYS[4]) ~= 'none' and keytype(KEYS[4]) ~= 'zset') then
  return {'INVALID_KEY_TYPE'}
end
local storedHash = redis.call('HGET', KEYS[2], 'requestHash')
if storedHash then
  if storedHash ~= ARGV[2] then return {'COMMAND_CONFLICT'} end
  return {'REPLAY', redis.call('HGET', KEYS[2], 'response') or ''}
end
local version = tonumber(redis.call('HGET', KEYS[1], 'version'))
if not version or version ~= expected then return {'VERSION_CONFLICT'} end
local nextVersion = expected + 1
redis.call('HSET', KEYS[1], 'version', nextVersion, 'snapshot', ARGV[3])
redis.call('HSET', KEYS[2], 'requestHash', ARGV[2], 'response', ARGV[4])
local eventId = redis.call('XADD', KEYS[3], '*', 'matchId', ARGV[7], 'version', nextVersion, 'type', ARGV[5], 'payload', ARGV[6], 'snapshot', ARGV[3])
if due then redis.call('ZADD', KEYS[4], due, ARGV[7]) else redis.call('ZREM', KEYS[4], ARGV[7]) end
return {'COMMITTED', tostring(nextVersion), eventId}
