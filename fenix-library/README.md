# fenix-library
This is Synkd's ad serving library. The main scripts used in this repo are:

* `src/fenix.js` - Our main ad library script. This handles sending requests to our API, and generating the ad containers.
* `src/creativeHelper.js` - This is a script with utility functions which is loaded with every ad and allows ads to easily integrate with our ad library.

We also keep a record of all of our ad formats inside of the `src/format` folder. This folder should be kept up to date if we add or change a format, but note that this folder is **not** used for ad serving. It's simply for us to keep a copy of each format.

If you want to update a format/format version, you'll need to update it in the `media_format` collection in our Mongo database. That collection is the only place that the formats are pulled from. But, you should still update this repo with your updated format to keep a copy.

## Deploying

1. Run `yarn deploy` in the root folder
2. Open the `deploy` folder
3. To deploy to live, open the `global` folder and then upload the `fenix.js` file inside there to our AWS S3 bucket `insprep`.
4. To deploy to staging, open the `staging` folder, rename `fenix.js` to `fenix-staging.js`, and then upload the file to our AWS S3 bucket `insprep`.
4. Purge the CDN using AWS Cloudfront (`media-cdn.synkd.life`)