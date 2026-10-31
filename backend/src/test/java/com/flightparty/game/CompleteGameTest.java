package com.flightparty.game;

import static com.flightparty.game.GameRules.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class CompleteGameTest {
    @Test void completeGamesForEverySeatCount() {
        for (var seats : List.of(List.of(0,1),List.of(0,1,2),List.of(0,1,2,3))) {
            for (int seed=0;seed<100;seed++) {
                var random=new Random(seed); var state=start(seats); int turns=0;
                while(state.phase()!=Phase.OVER && turns++<10000) {
                    state=roll(state,random.nextInt(6)+1);
                    int plane=botChoice(state);
                    assertTrue(legal(state).contains(plane));
                    state=advance(move(state,plane).state());
                    for(var player:state.players()) for(int progress:player.planes()) assertTrue(progress>=-1 && progress<=57);
                }
                assertEquals(Phase.OVER,state.phase(),"seed="+seed+" seats="+seats.size());
                assertEquals(seats.size(),state.ranking().stream().distinct().count());
                for(int i=0;i<2;i++) {
                    int seat=state.ranking().get(i);
                    assertTrue(state.players().stream().filter(p->p.seat()==seat).findFirst().orElseThrow().planes().stream().allMatch(p->p==57));
                }
            }
        }
    }
}
