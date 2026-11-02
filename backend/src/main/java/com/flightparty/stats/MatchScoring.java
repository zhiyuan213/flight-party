package com.flightparty.stats;

/** Server-only score calculation; finished aircraft are taken from the final authoritative state. */
public final class MatchScoring {
    public static final String VERSION="classic-score-3-2-0-0-plane2";
    private MatchScoring() {}
    public static int points(int rank,int finishedPlanes) {
        if(rank<1||rank>4||finishedPlanes<0||finishedPlanes>2)throw new IllegalArgumentException("invalid final score inputs");
        return (rank==1?3:rank==2?2:0)+2*finishedPlanes;
    }
}

