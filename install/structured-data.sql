drop schema if exists sd cascade; 
create schema sd; 
set search_path = sd;

create table artists(
    artist_id integer primary key,
    name text
);

create table albums(
    id integer primary key,
    artist_id integer references artists (artist_id),
    title text,
    year integer 
);

create table songs(
    album_id integer references albums (id),
    song_num integer,
    song_name text,
    "length" text,
    primary key (album_id, song_num)
);

insert into artists values (101,'Bob Dylan');

insert into albums values
  (1, 101, 'Down in the Groove', 1988),
  (2, 101, 'Another Side of Bob Dylan', 1964);
  
insert into songs
  values (1, 1, 'Let''s Stick Together'),
         (1, 2, 'When Did You Leave Heaven?');

