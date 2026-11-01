FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B verify

FROM build AS integration
RUN --mount=type=cache,target=/root/.m2 cp -a /root/.m2 /opt/test-m2
ENTRYPOINT ["mvn", "-o", "-Dmaven.repo.local=/opt/test-m2/repository", "-B"]
CMD ["test"]

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/flight-party-backend-0.1.0-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
