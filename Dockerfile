FROM alpine:latest
RUN apk add --no-cache ca-certificates wget unzip
RUN wget -O /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.22.14/pocketbase_0.22.14_linux_amd64.zip \
    && unzip /tmp/pb.zip -d /pb && rm /tmp/pb.zip
EXPOSE 8090
VOLUME /pb/pb_data
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
