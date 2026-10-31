package com.flightparty.billing;
import static org.junit.jupiter.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
class CreemSignatureTest {
 @Test void verifiesRawBytesAndRejectsTampering(){
  byte[] body="The quick brown fox jumps over the lazy dog".getBytes(StandardCharsets.UTF_8);
  String signature="f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8";
  assertTrue(CreemSignature.verify(body,signature,"key"));
  assertFalse(CreemSignature.verify("modified".getBytes(StandardCharsets.UTF_8),signature,"key"));
  assertFalse(CreemSignature.verify(body,signature,""));assertFalse(CreemSignature.verify(body,"invalid","key"));
 }
}
