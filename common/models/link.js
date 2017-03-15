'use strict';

module.exports = function(Link) {
  Link.validatesUniquenessOf('url');
};
