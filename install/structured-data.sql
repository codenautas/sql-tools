drop schema if exists sd cascade; 
create schema sd; 
set search_path = sd;

create table artists(
    id integer primary key,
    name text,
    lastname text
);

create table record_labels(
    record_label text primary key,
    name text
);

create table genres(
    genre text primary key,
    name text
);

create table albums(
    id integer primary key,
    artist_id integer references artists(id),
    title text,
    year integer,
    record_label text references record_labels(record_label)
);

create table songs(
    album_id integer references albums (id),
    song_num integer,
    song_name text,
    "length" text,
    genre text references genres(genre),
    primary key (album_id, song_num)
);

insert into artists
  values (101, 'Bob', 'Dylan'),
         (102, 'Paul', 'McCartney');

insert into genres
  values ('rock', 'Rock'),
         ('blues', 'Blues');
         
insert into record_labels
  values ('sonymusic', 'Sony Music'),
         ('emi', 'EMI'),
         ('wb', 'Warner Bros');

insert into albums
  values (1, 101, 'Down in the Groove', 1988, 'sonymusic'), (2, 101, 'Tempest', 2012, 'wb');
  
insert into songs
  values (1, 1, 'Let''s Stick Together', null, 'rock'),
         (1, 2, 'When Did You Leave Heaven?', null, 'blues');
