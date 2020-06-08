'use strict';
import { Router } from 'express';
import uuidv4 from 'uuid/v4';
import validate from 'validate.js';

import models from '../../models';
import { limitConstraints, offsetConstraints } from '../../validators/basic'
import { linkConstraints, 
         boolConstraints,
         uuidConstraints,
         sortConstraints,
         dirConstraints,
         filterConstraints,
         filterValueConstraints } from '../../validators/bookmarks'

const router = Router();
const { Op } = require('sequelize');

/**
 * @api {get} [dev-]http://localhost:3010/api/v1/bookmarks/ Get all bookmarks
 * @apiDescription Получение всех данных о закладках
 * @apiVersion 1.0.0
 * @apiGroup Users
 * @apiPermission all
 *
 * @apiParam {Number} [limit=50] Ограничение на количество запрашиваемых записей
 * @apiParam {Number} [offset=0] Сдвиг при пагинации (по-умолчанию 0)
 * @apiParam {String} [filter] Имя поля для фильтрации ("createdAt", "favorites")
 * @apiParam {(Number|String)} [filter_value] Точное значение фильтрации, тип завист от поля фильтрации
 * @apiParam {Number} [filter_from] Используется для фильтрации >=
 * @apiParam {Number} [filter_to] Используется для фильтрации <=
 * @apiParam {String} [sort_by="createdAt"] Имя поля для сортировки ("createdAt", "favorites")
 * @apiParam {String} [sort_dir="asc"] Направление сортировки ("asc", "desc")
 *
 *
 *
 * @apiSuccessExample SUCCESS:
 *   HTTP/1.1 200 OK
 *   {
 *     length: 987, // Всего записей с указанным фильтром в БД
 *     data: [
 *     {
 *       guid: '97f10d85-5d2f-4450-a0c4-307e8e9a991f',
 *       link: 'https://ya.ru',
 *       createdAt: "2019-10-15T17:51:16.951Z",
 *       description: 'Тот самый Яндекс',
 *       favorites: false
 *     },
 *     ...
 *   ]
 * }
 *
 *   HTTP/1.1 400 Bad Request - некорректные параметры
 *   {
 *     "errors": [
 *       {
 *        code: 'BOOKMARKS_INVALID_LINK',
 *        description: 'Invalid link'
 *       }
 *      ]
 *   }
 * @apiErrorCode CODES OF ERRORS:
 *      - code: 'BOOKMARKS_INVALID_FAVORITES',
 *        description: 'Invalid favorite parameter'
 *      - code: 'SORTCONSTRAINTS_ERROR',
 *        description: 'You can enter only \'createdAt\' or \'favorites\''
 *      - code: 'DIRCONSTRAINTS_ERROR',
 *        description: 'You can enter only \'asc\' and \'desc\''
 *      - code: 'INVALID_FILTER_VALUES',
 *        description: 'Filter_value must be set'
 *      - code: 'INVALID_UNSET_FILTER_PARAMS',
 *        description: 'Filter_value or filter_to or filter_from must be set'
 *      - code: 'FILTER_UNSET',
 *        description: 'Filter field not set'
 *      - code: 'FILTER_VALUE_IN_FAVORITE_FILTERS',
 *        description: 'Use filter_value with favorites filter'
 *      - code: 'FILTER_FOR_TIMESTAMP',
 *        description: 'Values of filter must be integer'
 *      - code: 'FILTER_VALUE_UNSET_FOR_RANGE',
 *        description: 'Filter_value must be unset when doing range filter'
 *      - code: 'FILTER_RANGE_ERROR',
 *        description: 'Filter range error: filter_from > filter_to'
 */


router.get('/', async (req, res) => {
  // пример запроса GET для проверки
  // http GET localhost:3010/api/v1/bookmarks filter==favorites filter_value==false
  try {
    const validationFields = validate(req.query, {
      limit:          limitConstraints,
      offset:         offsetConstraints,
      sort_dir:       sortConstraints,
      sort_by:        dirConstraints,
      filter:         filterConstraints,
      filter_value:   filterValueConstraints,
      filter_from:    filterValueConstraints,
      filter_to:      filterValueConstraints
    },{fullMessages: false});

    if (validationFields) {
      res.status(400).json(
        generatingJsonErrors(validationFields[Object.keys(validationFields)[0]][0])
      );
    } else {
      const offset = req.query.offset || 0;
      const limit = req.query.limit || 50;
      const filter = req.query.filter;
      let filter_value = req.query.filter_value;
      let filter_from = req.query.filter_from;
      let filter_to = req.query.filter_to;
      const sort_by = req.query.sort_by || "createdAt";
      const sort_dir = req.query.sort_dir || "asc";

      if (filter == "favorites")
        filter_value = (filter_value == "true");
      if (filter == "createdAt"){
        if (validate.isDefined(filter_value))
          filter_value = parseInt(filter_value);
        if (validate.isDefined(filter_from))
          filter_from = parseInt(filter_from);
        if (validate.isDefined(filter_to))
          filter_to = parseInt(filter_to);
      }

      let query = {
        attributes: ["guid", "link", "createdAt", "description", "favorites"],
        where:{},
        order: [[sort_by, sort_dir]],
        offset: offset,
        limit: limit};

      if (filter){
        query.where[filter] = {};
        if (validate.isDefined(filter_value))
          query.where[filter][Op.eq] = filter_value;
        if (validate.isDefined(filter_from))
            query.where[filter][Op.gte] = filter_from;
        if (validate.isDefined(filter_to))
            query.where[filter][Op.lte] = filter_to;
      }
      await models.bookmarks.findAndCountAll(query)
        .then(result => {
          res.status(200).json({length: result.count, data: result.rows})})
    }
  } catch (error) {
    console.log(error);
  }
});

/**
 * @api {post} [dev-]http://localhost:3010/api/v1/bookmarks/ Create a bookmark
 * @apiDescription Создание закладки
 * @apiVersion 1.0.0
 * @apiGroup Users
 * @apiPermission all
 *
 * @apiParam {String}  guid         - Уникальный идентификатор id закладки
 * @apiParam {String}  link         - Ссылка на закладку пользователя
 * @apiParam {Date}    createdAt    - Дата создания закладки [Добавляется автоматически].
 * @apiParam {String}  description  - Описание добавленной закладки [необязательное поле]
 * @apiParam {Boolean} favorites    - Индикатор для обозначения избранных закладок 
 *                                    [необязательное поле]
 * @apiSuccessExample SUCCESS:
 *   HTTP/1.1 201 Created
 *   {
 *      data: {
 *        guid: '97f10d85-5d2f-4450-a0c4-307e8e9a991f', 
 *        createdAt: 1547459442106
 *      }
 *   }
 *
 *   HTTP/1.1 400 Bad Request - некорректные параметры
 *   {
 *     "errors": [
 *       {
 *        code: 'BOOKMARKS_INVALID_LINK',
 *        description: 'Invalid link'
 *       }
 *      ]
 *   }
 *
 * @apiErrorCode CODES OF ERRORS:
 *      - code: 'BOOKMARKS_INVALID_FAVORITES',
 *        description: 'Invalid favorite parameter'
 *      - code: 'BOOKMARKS_INVALID_LINK',
 *        description: 'Invalid link'
 *      - code: 'BOOKMARKS_BLOCKED_DOMAIN',
 *        description: 'yahoo.com banned'
 *      - code: 'LINK_IS_UNDIFINED',
 *        description: 'You did\'t enter a link'
 */

router.post('/', async (req,res) => {
  // пример запроса post для проверки
  // http POST localhost:3010/api/v1/bookmarks link='https://nodejs.org' \
  // description='some descr' favorites='true'  
  try {
    const link = req.body.link;

    if (typeof link == 'undefined')
      res.status(400).json(generatingJsonErrors('LINK_IS_UNDIFINED'));

    const validationFavorite = validate(req.body,{ 
        favorites: boolConstraints 
    },{fullMessages: false});

    const validationURL = validate(
      {
        website: req.body.link, 
        domain: req.body.link
      }, linkConstraints
    );

    if (validationURL && validationURL.website)
      res.status(400).json(generatingJsonErrors(validationURL.website[0]));
    else if (validationURL && validationURL.domain)
      res.status(400).json(generatingJsonErrors(validationURL.domain[0]));
    else if (validationFavorite){
      res.status(400).json(generatingJsonErrors(validationFavorite.favorites[0]));
    } else {
      const bookmark = await models.bookmarks.create({
        guid: uuidv4(),
        createdAt: Date.now(),
        link: req.body.link,
        description: req.body.description,
        favorites: req.body.favorites
      });

      res.status(201).json({ 
        data: {
          guid: bookmark.guid, 
          createdAt: bookmark.createdAt.getTime(), 
          favorites: bookmark.favorites 
        } 
      });
    }
  } catch (error){
    console.log(error);
  }
});

/**
 * @api {patch} [dev-]http://localhost:3010/api/v1/bookmarks/:guid Update a bookmark
 * @apiDescription Изменение некоторых параметров закладки
 * @apiVersion 1.0.0
 * @apiGroup Users
 * @apiPermission all
 *
 * @apiParam {String}  link           - Ссылка пользователя
 * @apiParam {Date}    updatedtedAt   - Дата создания ссылки. [Добавляется автоматически].
 * @apiParam {String}  description    - Описание добавленной ссылки [необязательное поле]
 * @apiParam {Boolean} favorites      - Индикатор для обозначения избранных ссылок [необязательное поле]
 *
 * @apiSuccessExample SUCCESS:
 *   HTTP/1.1 200 OK - Изменение прошло успешно
 *
 * @apiErrorExample EXAMPLES:
 *   HTTP/1.1 404 Not Found - нет закладки с таким ID
 * 
 *   HTTP/1.1 400 Bad Request - некорректные параметры
 *   {
 *     "errors": [
 *       {
 *        code: 'BOOKMARKS_INVALID_LINK',
 *        description: 'Invalid link'
 *       }
 *      ]
 *   }

 * @apiErrorCode CODES OF ERRORS:
 *      - code: 'BOOKMARKS_INVALID_DOMAIN',
 *        description: 'yahoo.com banned'
 *      - code: 'GUID_IS_UNDIFINED',
 *        description: 'You did\'t enter guid parameter'
 *      - code: 'BOOKMARKS_INVALID_FAVORITE',
 *        description: 'Invalid favorite parameter'
 *      - code: 'BOOKMARKS_INVALID_UUID',
 *        description: 'Invalid uuid'
 */

router.patch('/:guid', async (req,res) => {
  // пример запроса PATCH для проверки
  // http PATCH :3010/api/v1/bookmarks/6ea3c065-1714-4fc2-bc6e-f26d1254c865 \
  // link='https://youtube.com' favorites:=true
  try{
    const guid = req.params.guid;

    if (typeof guid == 'undefined')
      res.status(400).json(generatingJsonErrors('GUID_IS_UNDIFINED'));

    const validationGuid = validate(req.params, {guid: uuidConstraints});
    const validationLink = validate(
      {
        website: req.body.link, 
        domain: req.body.link
      }, linkConstraints
    );
    const validationBody = validate(req.body, {favorites: boolConstraints});

    const error = validationGuid || validationLink || validationBody;
    
    if (error){
      res.status(400).json(generatingJsonErrors(error));
      console.log('Some Error: ', error);
    } else { 
      const updatedValues = {
        link: req.body.link,
        description: req.body.description,
        favorites: req.body.favorites,
        updatedAt: Date.now()
      };

      await models.bookmarks.findByPk(guid)
        .then(findedBookmark => {
          if (!findedBookmark)
            res.sendStatus(404);
          else
            findedBookmark.update(updatedValues)
              .then(() => res.status(200).json("Изменение прошло успешно"));
        });
    }
  } catch (error) {
    console.log(error);
  }
});



/**
 * @api {get} [dev-]http://localhost:3010/api/v1/bookmarks/:guid Delete a bookmark
 * @apiDescription Удаление закладки
 * @apiVersion 1.0.0
 * @apiGroup Users
 * @apiPermission all
 * 
 * @apiSuccessExample SUCCESS:
 *   HTTP/1.1 200 OK
 *
 * @apiErrorExample ALL EXAMPLES:
 *   HTTP/1.1  404 Not found 
 * 
 */

 router.delete('/:guid', async (req,res) => { 
  // пример запроса DELETE для проверки
  // http DELETE :3010/api/v1/bookmarks/6ea3c065-1714-4fc2-bc6e-f26d1254c865
  try {
    const guid = req.params.guid;

    await models.bookmarks
    .findByPk(guid)
    .then(findedBookmark => {
      if (!findedBookmark)
        res.status(404).json("Нет закладки с таким ID");
      else
        findedBookmark.destroy().then(() => res.status(200).json("Удаление прошло успешно"));
    });
  } catch (error){
    console.log(error);
  }
}); 

// функция преобразует коды ошибок в json объекты с информацией для вывода
const generatingJsonErrors = (message) => {
  switch (message){
    
    case 'SORTCONSTRAINTS_ERROR': {
      return { code: message, description: 'You can enter only \'createdAt\' or \'favorites\'' }; 
    }
    case 'DIRCONSTRAINTS_ERROR': {
      return { code: message, description: 'You can enter only \'asc\' and \'desc\'' }; 
    }
    case 'FILTER_RANGE_ERROR': {
      return { code: message, description: 'Filter range error: filter_from > filter_to' }; 
    }
    case 'FILTER_VALUE_UNSET_FOR_RANGE': {
      return { code: message, description: 'Filter_value must be unset when doing range filter' }; 
    }
    case 'FILTER_FOR_TIMESTAMP': {
      return { code: message, description: 'Values of filter must be integer' }; 
    }
    case 'FILTER_VALUE_IN_FAVORITE_FILTERS': {
      return { code: message, description: 'Use filter_value with favorites filter' }; 
    }
    case 'FILTER_UNSET': {
      return { code: message, description: 'Filter field not set' }; 
    }
    case 'INVALID_UNSET_FILTER_PARAMS': {
      return { code: message, description: 'Filter_value or filter_to or filter_from must be set' }; 
    }
    case 'INVALID_FILTER_VALUES': {
      return { code: message, description: 'Filter_value must be set' }; 
    }
    case 'LINK_IS_UNDIFINED': {
      return { code: message, description: 'You did\'t enter a link' }; 
    }
    case 'BOOKMARKS_INVALID_LINK': {
      return { code: message, description: 'Invalid link' }; 
    }
    case 'GUID_IS_UNDIFINED': {
      return { code: message, description: 'You did\'t enter guid parameter' }; 
    }
    case 'BOOKMARKS_INVALID_FAVORITES': {
      return { code: message, description: 'Invalid favorite parameter' }; 
    }
    case 'BOOKMARKS_INVALID_UUID': {
      return { code: message, description: 'Invalid uuid' }; 
    }
  }
  console.log("message: ", message);
  if (message.match('BOOKMARKS_INVALID_DOMAIN')[0]){
    const splittedMes = message.split('/');
    return { code: splittedMes[3], description: splittedMes[2] + ' banned' };
  }

}

export default router;