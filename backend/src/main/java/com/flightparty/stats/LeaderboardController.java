package com.flightparty.stats;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/leaderboards")
public class LeaderboardController {
    private final LeaderboardService service;
    public LeaderboardController(LeaderboardService service) { this.service = service; }
    @GetMapping
    public List<LeaderboardService.Entry> get(@RequestParam String type) {
        if (!List.of("month","week","day","points","games").contains(type)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid leaderboard type");
        return service.top(type);
    }
}
