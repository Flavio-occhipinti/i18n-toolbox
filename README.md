
# i18n-toolbox
Extension vs code which allows to be more productive with i18n

# Configuration 

You can add a configuration file with the name 'i18n-toolbox.json' : 

```
{
     "searchI18nFile": false,
     "i18nFolder": "src/assets/i18n",
     "defaultLanguage": "en"
} 
```

If you don't add a configuration file, the default behavior is to search all files in the workspace with the name *.i18n.json and take the first in  [the default language](#the-default-language). 

Else it searches files in the i18nFolder.

if there are no key 'defaultLanguage', the default language is the first it finds.


## The default language 
If there are some missing keys in another language, i18n take the traduction in the default language.

# Features

On every file update, the JSON will be sorted alphabetically. 

## On the side bar view

![features demonstation](https://github.com/Flavio-occhipinti/i18n-toolbox/blob/master/ressources/readme/features.png)

Actions : 
- Add root key 
- Refresh
- Add child key
- Rename key
- Delete key

## In the edit panel

When you click on the key in the tree-view, the edit panel appears. You can see the full path of the key, and the text in each language.

![edit panel demonstration](https://github.com/Flavio-occhipinti/i18n-toolbox/blob/master/ressources/readme/edit-panel.png)

You can edit the text in each language and save it.

# Soon..

## Search bar

A search bar which allows to search text and key on the json file.

## tooltip on hover the i18n path

When there is a i18n key, you can see the translation in each language on hover. 
