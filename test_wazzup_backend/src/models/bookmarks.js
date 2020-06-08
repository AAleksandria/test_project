'use strict';
module.exports = (sequelize, DataTypes) => {
  var bookmarks = sequelize.define('bookmarks', {
    guid: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    link: {
      type: DataTypes.STRING(256),
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.TEXT
    },
    favorites: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    timestamps: false
  });

// убрал проверку на token, как описанно в тестовом задании 

  return bookmarks;
};