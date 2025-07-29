## `graphql-backend`
this is a revised version of the original graphql repo
equipped/upgraded to prisma 5
you might have submodule lingering about after you clone, to clean up the submodule, and do a fresh install, follow these steps: 

1. first, remove the submodule with `rm -rf fenix-library`
2. run `rm -rf .git/modules/fenix-library` to clear any lingering info 
3. add the module again `git submodule add https://github.com/inspired-mobile/fenix-library fenix-library`
4. initialize the module `git submodule init`
5. update the module `git submodule update`

make sure you're running on node:16 on local

### GraphQL
The GraphQL API is run using `apollo-server`.

To run the server:

1. *You should have access to our k8s clusters via kubectl before doing this*.
2. Run `npm i` to install dependencies
3. Edit your `/etc/hosts` file to map `prisma` to localhost (it should look like `127.0.0.1 prisma`)
4. Run `kubectl port-forward svc/prisma 4466:4466` to port-forward the prisma service in k8s to your local machine, running on port 4466. You will need to add `-n dev` to this command to use the staging (`dev` namespace) prisma service
2. Run `npm run dev` to start the server

### Prisma
Prisma is deployed independently of the GraphQL API. Docker is used to deploy, so make sure you have it installed on your system.

If you want to run a local instance of Prisma rather than use the services on the k8s cluster (for example, if you are testing schema changes locally):

1. Run `docker login registry-intl.eu-west-1.aliyuncs.com/inslondon/prisma` and login with your GitLab details
2. Go inside prisma folder and change `prisma.yml` endpoint to localhost:4466
3. Ensure that `docker-compose.yaml` points to the correct database (in the `services/environemnt/databases/default/uri` field). To use the database in the k8s clusters, make sure you port-forward the mongo service, and set the URI in the `docker-compose.yaml` file to point to `mongodb://<username>:<password>@localhost:27017/platform_production` (or change as appropriate).
3. Run `docker-compose up -d` from inside the `local` folder to deploy a local copy of prisma
4. Run `prisma deploy` to deploy changes. This will update the schema/project in the databases


##### Revolut
consists of guidelines for revolut auth, access and refreshtoken guides