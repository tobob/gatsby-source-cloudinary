const { newCloudinary, getResourceOptions } = require('./utils');
const type = `CloudinaryMedia`;

const getNodeData = (gatsby, media) => {
  return {
    ...media,
    id: gatsby.createNodeId(`cloudinary-media-${media.public_id}`),
    parent: null,
    internal: {
      type,
      content: JSON.stringify(media),
      contentDigest: gatsby.createContentDigest(media)
    }
  };
};

const addTransformations = (resource, transformation, secure) => {
  const splitURL = secure ? resource.secure_url.split('/') : resource.url.split('/');
  splitURL.splice(6, 0, transformation);

  const transformedURL = splitURL.join('/');
  return transformedURL;
}

const createCloudinaryNodes = (gatsby, cloudinary, options) => {
  return new Promise(async (resolve, reject) => {
    let nextCursor = null;
    let count = 0;
    do {
      const allOptions = nextCursor ? { ...options, next_cursor: nextCursor } : { ...options };
      await cloudinary.api.resources(allOptions, (error, result) => {
        const hasResources = (result && result.resources && result.resources.length);

        if (error) {
          console.error(error);
          reject(error);
          nextCursor = null;
          return;
        }

        if (!hasResources) {
          nextCursor = null;
          reject();
          return;
        }

        nextCursor = result.next_cursor;

        result.resources.forEach(resource => {
          const transformations = "q_auto,f_auto" // Default CL transformations, todo: fetch base transformations from config maybe.

          resource.url = addTransformations(resource, transformations);
          resource.secure_url = addTransformations(resource, transformations, true);

          const nodeData = getNodeData(gatsby, resource);
          gatsby.actions.createNode(nodeData);
        });
        count = count + result.resources.length;
      });
    } while (nextCursor);
    console.warn('Number of Cloudinary Resources: ', count);
    resolve();
  })
};

exports.sourceNodes = (gatsby, options) => {
  const cloudinary = newCloudinary(options);
  const resourceOptions = getResourceOptions(options);

  return createCloudinaryNodes(gatsby, cloudinary, resourceOptions);
};
