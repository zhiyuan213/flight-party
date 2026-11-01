package com.flightparty.room;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Only public nicknames cross the API boundary, never account IDs or email. */
@Service
public class RoomViewService {
    private final JdbcClient db;
    private final Map<UUID,Cached> cache=new ConcurrentHashMap<>();
    private record Cached(RoomRules.Room room,Instant expires,Map<Integer,String> names) {}
    public RoomViewService(JdbcClient db) { this.db=db; }
    public RoomSnapshot forMember(RoomRules.Room room,UUID principal,Instant now) {
        RoomSnapshot.forMember(room,principal,now); // Authorize before reading profiles.
        var found=cache.get(room.id());
        if(found==null || !found.room().equals(room) || !now.isBefore(found.expires())) {
            var names=new HashMap<Integer,String>();
            var ids=room.seats().stream().filter(s->!s.bot()).map(RoomRules.Seat::principal).toList();
            if(!ids.isEmpty()) {
                var profiles=db.sql("select p.id,a.display_name from principals p join accounts a on a.id=p.account_id where p.id in (:ids)")
                    .param("ids",ids).query((rs,n)->Map.entry(rs.getObject(1,UUID.class),rs.getString(2))).list();
                for(var profile:profiles) for(var seat:room.seats())
                    if(profile.getKey().equals(seat.principal())) names.put(seat.index(),profile.getValue());
            }
            // Preserve the original signed-in player's name after logout during a match.
            // Signing in mid-game can supply a nickname without changing score ownership.
            if(room.phase()==RoomRules.Phase.PLAYING || room.phase()==RoomRules.Phase.SETTLED) {
                db.sql("select p.seat_index,a.display_name from match_participants p join accounts a on a.id=p.account_id_at_start where p.match_id=:id")
                    .param("id",room.id()).query((rs,n)->{names.put(rs.getInt(1),rs.getString(2));return 0;}).list();
            }
            found=new Cached(room,now.plusSeconds(1),Map.copyOf(names));
            if(cache.size()>2000) cache.entrySet().removeIf(e->!now.isBefore(e.getValue().expires()));
            cache.put(room.id(),found);
        }
        return RoomSnapshot.forMember(room,principal,now,found.names());
    }
}
