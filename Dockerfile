FROM alpine:latest
RUN apk add --no-cache ca-certificates wget unzip

# Baixa e instala o PocketBase
RUN wget -O /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.22.14/pocketbase_0.22.14_linux_amd64.zip \
    && unzip /tmp/pb.zip -d /pb && rm /tmp/pb.zip

# Copia o frontend para pb_public (servido automaticamente pelo PocketBase)
COPY css/           /pb/pb_public/css/
COPY img/           /pb/pb_public/img/
COPY js/            /pb/pb_public/js/
COPY index.html     /pb/pb_public/index.html
COPY inscricao.html /pb/pb_public/inscricao.html

EXPOSE 8090
VOLUME /pb/pb_data
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
