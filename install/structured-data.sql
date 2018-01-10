drop schema if exists sd cascade; 
create schema sd; 
set search_path = sd;

create table albums(
    id integer primary key,
    title text,
    year integer 
);

create table songs(
    album_id integer references albums (id),
    song_num integer,
    song_name text,
    "length" text,
    primary key (album_id, song_name)
);

insert into albums
  values (1, 'Down in the Groove', 1988);
  
insert into songs
  values (1, 1, 'Let''s Stick Together'),
         (1, 2, 'When Did You Leave Heaven?');

