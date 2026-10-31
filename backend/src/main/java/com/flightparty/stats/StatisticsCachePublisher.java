package com.flightparty.stats;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Outbox-driven absolute statistics publication; no increments on message replay. */
@Component
public class StatisticsCachePublisher {
    private static final Logger LOG=LoggerFactory.getLogger(StatisticsCachePublisher.class);
    private final JdbcClient db;private final StringRedisTemplate redis;
    private static final DefaultRedisScript<Long> PUT=new DefaultRedisScript<>("""
        local kind=redis.call('TYPE',KEYS[1]).ok
        if kind~='none' and kind~='hash' then return -1 end
        local old=redis.call('HGET',KEYS[1],'version')
        if old and (#old>#ARGV[1] or (#old==#ARGV[1] and old>ARGV[1])) then return 0 end
        redis.call('HSET',KEYS[1],'version',ARGV[1],'points',ARGV[2],'completedGames',ARGV[3])
        redis.call('EXPIRE',KEYS[1],3600)
        return 1
        """,Long.class);
    public StatisticsCachePublisher(JdbcClient db,StringRedisTemplate redis) { this.db=db;this.redis=redis; }
    public boolean publishValue(UUID account,long version,long points,long games) {
        if(version<0 || games<0)throw new IllegalArgumentException("invalid statistic");
        Long result=redis.execute(PUT,List.of("fp:stats:"+account),Long.toString(version),Long.toString(points),Long.toString(games));
        if(result==null||result<0)throw new IllegalStateException("cache unavailable");
        return result==1;
    }
    @Scheduled(fixedDelay=1000)
    public void poll() {
        try {
            var accounts=db.sql("select distinct account_id from statistics_outbox where published_at is null order by account_id limit 50").query(UUID.class).list();
            for(var account:accounts) {
                try {
                    var value=db.sql("select stats_version,points,completed_games from account_statistics where account_id=:id")
                            .param("id",account).query((rs,row)->new Value(rs.getLong(1),rs.getLong(2),rs.getLong(3))).single();
                    publishValue(account,value.version(),value.points(),value.games());
                    redis.delete(List.of("fp:leaderboard:points","fp:leaderboard:games"));
                    db.sql("update statistics_outbox set published_at=now() where account_id=:id and stats_version<=:version and published_at is null")
                            .param("id",account).param("version",value.version()).update();
                } catch(RuntimeException failure) { LOG.warn("Statistics cache publication pending ({})",failure.getClass().getSimpleName()); }
            }
        } catch(RuntimeException failure) { LOG.warn("Statistics outbox unavailable ({})",failure.getClass().getSimpleName()); }
    }
    private record Value(long version,long points,long games) {}
}
