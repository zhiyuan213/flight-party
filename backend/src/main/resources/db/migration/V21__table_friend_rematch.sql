alter table table_rooms add column successor_id uuid references table_rooms(id);
create table table_rematch_votes(room_id uuid not null references table_rooms(id),principal_id uuid not null,primary key(room_id,principal_id));
