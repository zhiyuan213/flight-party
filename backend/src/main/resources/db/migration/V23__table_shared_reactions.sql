create table table_reactions (
 id bigserial primary key,
 room_id uuid not null references table_rooms(id),
 principal_id uuid not null,
 command_id uuid not null,
 emoji varchar(16) not null,
 created_at timestamptz not null default now(),
 unique(room_id,principal_id,command_id)
);
create index table_reactions_room_cursor on table_reactions(room_id,id);
