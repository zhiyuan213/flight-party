package com.flightparty.stats;

import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Reads committed statistics; no anonymous or native bot rows are produced. */
@Service
public class LeaderboardService {
    private final JdbcClient db;
    public LeaderboardService(JdbcClient db) { this.db = db; }
    public record Entry(String displayName, long points, long completedGames) {}

    public List<Entry> top(String type) {
        String order = switch (type) {
            case "points" -> "s.points DESC, s.completed_games DESC, a.id ASC";
            case "games" -> "s.completed_games DESC, s.points DESC, a.id ASC";
            default -> throw new IllegalArgumentException("invalid leaderboard type");
        };
        return db.sql("select a.display_name,s.points,s.completed_games from account_statistics s join accounts a on a.id=s.account_id where s.completed_games > 0 order by " + order + " limit 10")
                .query((rs, row) -> new Entry(rs.getString(1), rs.getLong(2), rs.getLong(3))).list();
    }
}
