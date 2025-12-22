set role to test_user;
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
         ('blues', 'Blues'),
         ('cumbia', 'Cumbia');
         
insert into record_labels
  values ('sonymusic', 'Sony Music'),
         ('emi', 'EMI'),
         ('wb', 'Warner Bros');

insert into albums
  values (1, 101, 'Down in the Groove', 1988, 'sonymusic'), (2, 101, 'Tempest', 2012, 'wb'), 
  (4, 102, 'Pupurri', 1971, 'sonymusic');
  
insert into songs
  values (1, 2, 'When Did You Leave Heaven?', null, 'blues'),
         (1, 1, 'Let''s Stick Together', null, 'rock'),
         (4, 1, 'La bolsa', '1:00', 'rock'),
         (4, 2, 'Pollera Amarilla', '2:00', 'cumbia'),
         (4, 3, 'Ocho cuarenta', null, null);

create table paises(
  pais text,
  nombre text,
  primary key (pais)
);

create table provincias(
  pais text,
  provincia text,
  nombre text,
  primary key(pais, provincia)
);

create table departamentos(
  pais text,
  provincia text,
  departamento text,
  nombre text,
  primary key(pais, provincia, departamento)
);
