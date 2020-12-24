#!/bin/sh
MONGO_INITDB_DATABASE=$(cat "$MONGO_INITDB_DATABASE_FILE")
MONGO_INITDB_USERNAME=$(cat "$MONGO_INITDB_USERNAME_FILE")

mongo -- "$MONGO_INITDB_DATABASE" <<EOF
    var rootUser = '$(cat "$MONGO_INITDB_ROOT_USERNAME_FILE")';
    var rootPassword = '$(cat "$MONGO_INITDB_ROOT_PASSWORD_FILE")';
    var admin = db.getSiblingDB('admin');
    admin.auth(rootUser, rootPassword);

    var user = '$MONGO_INITDB_USERNAME';
    var passwd = '$(cat "$MONGO_INITDB_PASSWORD_FILE")';
    db.createUser({user: user, pwd: passwd, roles: ["readWrite"]});
EOF

echo "Init account for $MONGO_INITDB_DATABASE done"