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
    private record Cached(RoomRules.Room room,Instant expires,Map<Integer,String> names,Map<Integer,com.flightparty.auth.AppearanceService.Appearance> appearances) {}
    public RoomViewService(JdbcClient db) { this.db=db; }
    public RoomSnapshot forMember(RoomRules.Room room,UUID principal,Instant now) {
        RoomSnapshot.forMember(room,principal,now); // Authorize before reading profiles.
        var found=cache.get(room.id());
        if(found==null || !found.room().equals(room) || !now.isBefore(found.expires())) {
            var names=new HashMap<Integer,String>();
            var appearances=new HashMap<Integer,com.flightparty.auth.AppearanceService.Appearance>();
            var ids=room.seats().stream().filter(s->!s.bot()).map(RoomRules.Seat::principal).toList();
            if(!ids.isEmpty()) {
                var profiles=db.sql("select p.id,a.display_name,a.avatar_frame,"+com.flightparty.auth.AppearanceService.MEMBER_SQL+",a.flight_trail,a.victory_effect,a.avatar_token,a.plane_style from principals p join accounts a on a.id=p.account_id where p.id in (:ids)")
                    .param("ids",ids).query((rs,n)->Map.entry(rs.getObject(1,UUID.class),new Object[]{rs.getString(2),rs.getString(3),rs.getBoolean(4),rs.getString(5),rs.getString(6),rs.getObject(7,UUID.class),rs.getString(8)})).list();
                for(var profile:profiles) for(var seat:room.seats())
                    if(profile.getKey().equals(seat.principal())) {var v=profile.getValue();names.put(seat.index(),(String)v[0]);appearances.put(seat.index(),com.flightparty.auth.AppearanceService.profile((boolean)v[2],(String)v[1],(String)v[3],(String)v[4],(UUID)v[5],(String)v[6]));}
            }
            // Preserve the original signed-in player's name after logout during a match.
            // Signing in mid-game can supply a nickname without changing score ownership.
            if(room.phase()==RoomRules.Phase.PLAYING || room.phase()==RoomRules.Phase.SETTLED) {
                db.sql("select p.seat_index,a.display_name,a.avatar_frame,"+com.flightparty.auth.AppearanceService.MEMBER_SQL+",a.flight_trail,a.victory_effect,a.avatar_token,a.plane_style from match_participants p join accounts a on a.id=coalesce(p.account_id_at_start,p.score_account_id) where p.match_id=:id")
                    .param("id",room.id()).query((rs,n)->{names.put(rs.getInt(1),rs.getString(2));appearances.put(rs.getInt(1),com.flightparty.auth.AppearanceService.profile(rs.getBoolean(4),rs.getString(3),rs.getString(5),rs.getString(6),rs.getObject(7,UUID.class),rs.getString(8)));return 0;}).list();
            }
            found=new Cached(room,now.plusSeconds(1),Map.copyOf(names),Map.copyOf(appearances));
            if(cache.size()>2000) cache.entrySet().removeIf(e->!now.isBefore(e.getValue().expires()));
            cache.put(room.id(),found);
        }
        return RoomSnapshot.forMember(room,principal,now,found.names(),found.appearances());
    }
}
