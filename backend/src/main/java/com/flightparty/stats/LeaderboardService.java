package com.flightparty.stats;

import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Reads committed statistics; no anonymous or native bot rows are produced. */
@Service
public class LeaderboardService {
    private final JdbcClient db;
    public LeaderboardService(JdbcClient db) { this.db = db; }
    public record Entry(String displayName, long points, long completedGames,boolean member,String avatarFrame,String avatarUrl,boolean annualMember) {}

    public List<Entry> top(String type) {
        if (List.of("month","week","day").contains(type)) {
            return db.sql("select a.display_name,sum(r.points_delta),count(*),"+com.flightparty.auth.AppearanceService.MEMBER_SQL+",a.avatar_frame,a.avatar_token,a.system_avatar,"+com.flightparty.auth.AppearanceService.ANNUAL_MEMBER_SQL+" from account_match_results r join matches m on m.id=r.match_id join accounts a on a.id=r.account_id where m.status='SETTLED' and m.settled_at >= (date_trunc(:period,now() at time zone 'UTC') at time zone 'UTC') and m.settled_at <= now() group by a.id,a.display_name order by sum(r.points_delta) desc,count(*) desc,a.id asc limit 10")
                    .param("period",type).query((rs,row)->new Entry(rs.getString(1),rs.getLong(2),rs.getLong(3),rs.getBoolean(4),rs.getBoolean(4)?rs.getString(5):"none",rs.getBoolean(4)&&rs.getObject(6)!=null?"/api/avatars/"+rs.getObject(6):"/api/avatars/system/"+rs.getInt(7),rs.getBoolean(8))).list();
        }
        String order = switch (type) {
            case "points" -> "s.points DESC, s.completed_games DESC, a.id ASC";
            case "games" -> "s.completed_games DESC, s.points DESC, a.id ASC";
            default -> throw new IllegalArgumentException("invalid leaderboard type");
        };
        return db.sql("select a.display_name,s.points,s.completed_games,"+com.flightparty.auth.AppearanceService.MEMBER_SQL+",a.avatar_frame,a.avatar_token,a.system_avatar,"+com.flightparty.auth.AppearanceService.ANNUAL_MEMBER_SQL+" from account_statistics s join accounts a on a.id=s.account_id where s.completed_games > 0 order by " + order + " limit 10")
                .query((rs, row) -> new Entry(rs.getString(1), rs.getLong(2), rs.getLong(3),rs.getBoolean(4),rs.getBoolean(4)?rs.getString(5):"none",rs.getBoolean(4)&&rs.getObject(6)!=null?"/api/avatars/"+rs.getObject(6):"/api/avatars/system/"+rs.getInt(7),rs.getBoolean(8))).list();
    }
}

