set search_path = sd;

select to_jsonb(a.*) 
   || jsonb_build_object('songs',(select jsonb_agg(to_jsonb(s.*))
         from songs s
         where a.id = s.album_id))
  from albums a
  where a.id=1;
  
delete from songs 
  where album_id = 1
    and song_num not in (select song_num from jsonb_populate_recordset(null::songs, '[
                    {"song_num":2, "song_name":"When Did You Leave Heaven?", "length": "2:15"},
                    {"song_num":3, "song_name":"Sally Sue Brown"}
                    ]'::jsonb
                    ));

update songs 
   set song_name = source.song_name, length = source.length
   from jsonb_populate_recordset(null::songs, '[
                    {"song_num":2, "song_name":"When Did You Leave Heaven?", "length": "2:15"},
                    {"song_num":3, "song_name":"Sally Sue Brown"}
                    ]'::jsonb
                ) source
   where songs.album_id = 1;

insert into songs (select source.* 
   from jsonb_populate_recordset(null::songs, '[
                    {"song_num":2, "song_name":"When Did You Leave Heaven?", "length": "2:15"},
                    {"song_num":3, "song_name":"Sally Sue Brown"}
                    ]'::jsonb
                ) source left join songs on songs.album_id = 1 and songs.song_num = source.song_num);

select *
  from songs;
  
