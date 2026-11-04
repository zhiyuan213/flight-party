package com.flightparty.table;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
@Component public class TableScheduler {
 private final TableService service;public TableScheduler(TableService service){this.service=service;}
 @Scheduled(fixedDelay=1000) public void tick(){for(var id:service.pending())try{service.advance(id);}catch(Exception ignored){org.slf4j.LoggerFactory.getLogger(TableScheduler.class).warn("Table room advance failed: {}",id);}}
}
