import java.net.*;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.util.concurrent.*;
import java.util.regex.*;

/** Real multi-window presence check. Creates only disposable anonymous waiting seats. */
class PresenceSocketSmoke {
    static final String BASE=System.getenv().getOrDefault("FLIGHTPARTY_TEST_ORIGIN","http://backend:8080");
    static String field(String json,String key){var m=Pattern.compile("\""+key+"\":\"([^\"]+)\"").matcher(json);if(!m.find())throw new AssertionError(key);return m.group(1);}
    static int seats(String json){return (int)Pattern.compile("\"index\":").matcher(json).results().count();}
    static class Client {
        final HttpClient http=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).build();String token,header;
        Client() throws Exception {var csrf=request("/api/csrf",null);header=field(csrf,"headerName");token=field(csrf,"token");request("/api/session/guest","{}");}
        String request(String path,String body)throws Exception{
            var b=HttpRequest.newBuilder(URI.create(BASE+path)).timeout(java.time.Duration.ofSeconds(10));
            if(body!=null)b.header(header,token).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body));
            var r=http.send(b.build(),HttpResponse.BodyHandlers.ofString());if(r.statusCode()!=200)throw new AssertionError(path+" HTTP "+r.statusCode());return r.body();
        }
        WebSocket connect(String room)throws Exception{
            var first=new CompletableFuture<Void>();
            var socket=http.newWebSocketBuilder().header("Origin",BASE).buildAsync(URI.create(BASE.replaceFirst("^http","ws")+"/ws"),new WebSocket.Listener(){
                public void onOpen(WebSocket s){s.request(Long.MAX_VALUE);}
                public CompletionStage<?> onText(WebSocket s,CharSequence text,boolean last){if(last)first.complete(null);return null;}
                public CompletionStage<?> onPing(WebSocket s,ByteBuffer message){return s.sendPong(message);}
                public void onError(WebSocket s,Throwable error){first.completeExceptionally(error);}
            }).get(10,TimeUnit.SECONDS);
            socket.sendText("{\"type\":\"SUBSCRIBE\",\"roomId\":\""+room+"\"}",true).join();first.get(10,TimeUnit.SECONDS);return socket;
        }
    }
    public static void main(String[] args)throws Exception{
        var a=new Client();var b=new Client();String room=field(a.request("/api/rooms","{}"),"roomId");b.request("/api/rooms/join","{\"code\":\""+room+"\"}");
        var sa=a.connect(room);var b1=b.connect(room);var b2=b.connect(room);
        b1.sendClose(1000,"one window closed").join();Thread.sleep(18000);
        if(seats(a.request("/api/rooms/"+room+"/snapshot",null))!=2)throw new AssertionError("other window must keep seat");
        System.out.println("PASS: closing one of two windows preserves the shared seat after grace");
        b2.sendClose(1000,"all windows closed").join();Thread.sleep(18000);
        if(seats(a.request("/api/rooms/"+room+"/snapshot",null))!=1||!b.request("/api/me",null).contains("\"activeRoomId\":null"))throw new AssertionError("offline seat not released");
        System.out.println("PASS: last window close releases only its waiting seat after grace");
        b.request("/api/rooms/join","{\"code\":\""+room+"\"}");var b3=b.connect(room);b3.sendClose(1000,"reload").join();Thread.sleep(3000);var b4=b.connect(room);Thread.sleep(18000);
        if(seats(a.request("/api/rooms/"+room+"/snapshot",null))!=2)throw new AssertionError("reconnected seat lost");
        b.request("/api/rooms/"+room+"/leave","{}");if(seats(a.request("/api/rooms/"+room+"/snapshot",null))!=1)throw new AssertionError("explicit leave not immediate");
        System.out.println("PASS: reconnect during grace retains seat; explicit leave releases it immediately");
        b4.abort();a.request("/api/rooms/"+room+"/leave","{}");sa.abort();
    }
}
