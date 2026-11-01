alter table accounts add column avatar_image bytea;
alter table accounts add column avatar_token uuid unique;

alter table accounts add column plane_style varchar(20) not null default 'classic';
