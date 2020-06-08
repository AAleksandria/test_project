'use strict';
import validate from 'validate.js';

export const linkConstraints = {
	presence: true,
	website: {
		url: {
			schemes: ['http', 'https'],
			message: '^BOOKMARKS_INVALID_LINK'
		}
	},
	domain: {
		exclusion: {
			within: [
				'https://yahoo.com',
				'http://yahoo.com', 
				'https://socket.io',
				'http://socket.io'
			],
			message: '^%{value}/BOOKMARKS_INVALID_DOMAIN' 
		}
	}
};

const uuidRegex =
  '^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$';

export const uuidConstraints = {
  format: {
    pattern: uuidRegex,
    flags: 'i',
    message: '^BOOKMARKS_INVALID_UUID'
  }
};

export const boolConstraints = {
  inclusion:{
    within: [
      true,
      false,
      'true',
      'false'
    ],
  message: 'BOOKMARKS_INVALID_FAVORITES'
  }
};

export const sortConstraints = {
  inclusion:{
    within: [
      'createdAt',
      'favorites'
    ],
  message: 'SORTCONSTRAINTS_ERROR'
  }
};

export const dirConstraints = {
  inclusion:{
    within: [
      'asc',
      'desc',
      'ASC',
      'DESC'
    ],
  message: 'DIRCONSTRAINTS_ERROR'
  }
};

validate.validators.filterConstraints = function(value, options, key, attributes){
  if (!value)
    return null;

  let invalidValue = validate.single(value, sortConstraints);
  if (invalidValue)
    return invalidValue + " in filter param";

  if (value == "favorites" &&
      validate.isEmpty(attributes.filter_value))
    return "INVALID_FILTER_VALUES";

  if (value == "createdAt" &&
      validate.isEmpty(attributes.filter_value) &&
      validate.isEmpty(attributes.filter_from) &&
      validate.isEmpty(attributes.filter_to))
      return "INVALID_UNSET_FILTER_PARAMS";

  return null;
};

validate.validators.filterValueConstraints = function(value, options, key, attributes) {
  if (!value)
    return null;

  if (!attributes.filter)
    return "FILTER_UNSET";

  if (attributes.filter == "favorites")
    if (key != "filter_value")
      return "^FILTER_VALUE_IN_FAVORITE_FILTERS";
    else
      return validate.single(value,boolConstraints);

  if (validate.single(value, { numericality: { onlyInteger: true } }))
        return "FILTER_FOR_TIMESTAMP";

  if ((key == "filter_from" || key == "filter_to") &&
      validate.isDefined(attributes.filter_value))
        return "FILTER_VALUE_UNSET_FOR_RANGE";

  if (key == "filter_from" && attributes.filter_to < value)
    return "FILTER_RANGE_ERROR"

  return null;

};

export const filterConstraints = {filterConstraints: true};
export const filterValueConstraints = {filterValueConstraints: true};