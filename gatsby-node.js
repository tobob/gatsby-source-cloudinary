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
  return new Promise((resolve, reject) => {
    cloudinary.api.resources(options, (error, result) => {
      const hasResources = (result && result.resources && result.resources.length);

      if (error) {
        console.error(error);
        reject(error);
        return;
      }

      if (!hasResources) {
        console.warn('\n ~Yikes! No nodes created because no Cloudinary resources found. Try a different query?');
        resolve();
        return;
      }

      let nextCursor = result.next_cursor;

      result.resources.forEach(resource => {
        const transformations = "q_auto,f_auto" // Default CL transformations, todo: fetch base transformations from config maybe.

        resource.url = addTransformations(resource, transformations);
        resource.secure_url = addTransformations(resource, transformations, true);

        const nodeData = getNodeData(gatsby, resource);
        gatsby.actions.createNode(nodeData);
      });
      if (!nextCursor) {
        resolve()
      }

      cloudinary.api.resources({ ...options, next_cursor: result.next_cursor }, (error, result) => {
        const hasResources = (result && result.resources && result.resources.length);
        console.info('If this is equal 500 then you need to fix cloudinary again', hasResources);

        if (error) {
          console.error(error);
          reject(error);
          return;
        }

        if (!hasResources) {
          console.warn('\n ~Yikes! No nodes created because no Cloudinary resources found. Try a different query?');
          resolve();
          return;
        }

        result.resources.forEach(resource => {
          const transformations = "q_auto,f_auto" // Default CL transformations, todo: fetch base transformations from config maybe.

          resource.url = addTransformations(resource, transformations);
          resource.secure_url = addTransformations(resource, transformations, true);

          const nodeData = getNodeData(gatsby, resource);
          gatsby.actions.createNode(nodeData);
        });

        resolve();
      });
    });
  })
};

exports.sourceNodes = (gatsby, options) => {
  const cloudinary = newCloudinary(options);
  const resourceOptions = getResourceOptions(options);

  return createCloudinaryNodes(gatsby, cloudinary, resourceOptions);
};
