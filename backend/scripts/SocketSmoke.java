import java.net.*;
import java.net.http.*;
import java.util.concurrent.*;
import java.util.UUID;
import java.util.regex.*;

class SocketSmoke {
    static final String BASE=System.getenv().getOrDefault("FLIGHTPARTY_TEST_ORIGIN","http://backend:8080");
    static class Client {
        final HttpClient http=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).build();
        String token,header;
        String request(String path,String body) throws Exception {
            var builder=HttpRequest.newBuilder(URI.create(BASE+path));
            if(body!=null) builder.header(header,token).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body));
            var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200) throw new AssertionError("HTTP "+response.statusCode());
            return response.body();
        }
        Client() throws Exception { String csrf=request("/api/csrf",null);header=field(csrf,"headerName");token=field(csrf,"token");request("/api/session/guest","{}"); }
        void snapshot(String room,String reactionId) throws Exception {
            var received=new CompletableFuture<String>();
            WebSocket socket=http.newWebSocketBuilder().header("Origin",BASE).buildAsync(URI.create(BASE.replaceFirst("^http","ws")+"/ws"),new WebSocket.Listener() {
                final StringBuilder text=new StringBuilder();
                public void onOpen(WebSocket socket) { socket.request(1); }
                public CompletionStage<?> onText(WebSocket socket,CharSequence data,boolean last) {
                    text.append(data);if(last)received.complete(text.toString());socket.request(1);return null;
                }
                public void onError(WebSocket socket,Throwable error) { received.completeExceptionally(error); }
            }).get(10,TimeUnit.SECONDS);
            socket.sendText("{\"type\":\"SUBSCRIBE\",\"roomId\":\""+room+"\"}",true).join();
            String message=received.get(10,TimeUnit.SECONDS);
            if(!message.contains("SNAPSHOT") || !message.contains(room) || message.contains("principal") || !message.contains(reactionId)) throw new AssertionError("invalid snapshot or missing shared reaction");
            socket.sendClose(1000,"done").join();
        }
    }
    static String field(String json,String key) { var matcher=Pattern.compile("\""+key+"\":\"([^\"]+)\"").matcher(json);if(!matcher.find())throw new AssertionError(key);return matcher.group(1); }
    public static void main(String[] args) throws Exception {
        var a=new Client();var b=new Client();String room=field(a.request("/api/rooms","{}"),"roomId");
        try { b.request("/api/rooms/join","{\"code\":\""+room+"\"}");String command=UUID.randomUUID().toString();String body="{\"commandId\":\""+command+"\",\"emoji\":\"🎉\"}";String reaction=a.request("/api/rooms/"+room+"/reaction",body);if(!reaction.equals(a.request("/api/rooms/"+room+"/reaction",body)))throw new AssertionError("reaction replay differs");String event=field(reaction,"eventId");a.snapshot(room,event);b.snapshot(room,event);System.out.println("Two independent sessions received identical shared reaction over WebSocket"); }
        finally { b.request("/api/rooms/"+room+"/leave","{}");a.request("/api/rooms/"+room+"/leave","{}"); }
    }
}
