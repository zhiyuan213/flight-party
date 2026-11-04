create table table_chat (
 id bigserial primary key,
 room_id uuid not null references table_rooms(id),
 principal_id uuid not null,
 command_id uuid not null,
 sender_seat integer not null check(sender_seat between 0 and 1),
 sender_name varchar(120) not null,
 message varchar(400) not null,
 created_at timestamptz not null default now(),
 unique(room_id,principal_id,command_id)
);
create index table_chat_room_cursor on table_chat(room_id,id);
