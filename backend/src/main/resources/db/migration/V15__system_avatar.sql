alter table accounts add column system_avatar smallint not null default 0 check(system_avatar between 0 and 3);
