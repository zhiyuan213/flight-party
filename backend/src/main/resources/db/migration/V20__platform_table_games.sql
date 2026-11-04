create table table_rooms (
 id uuid primary key, game varchar(16) not null, origin varchar(16) not null,
 phase varchar(16) not null, state text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index table_rooms_matching on table_rooms(game,phase,origin);
create table table_commands(room_id uuid not null references table_rooms(id), principal_id uuid not null, command_id uuid not null, primary key(room_id,principal_id,command_id));
create table table_results(room_id uuid not null references table_rooms(id),account_id uuid not null references accounts(id),game varchar(16) not null,rank integer not null,points integer not null,created_at timestamptz not null default now(),primary key(room_id,account_id));
