create table table_room_ready(room_id uuid not null references table_rooms(id),principal_id uuid not null,primary key(room_id,principal_id));
