
# i18n-toolbox
Extension vs code which allows you to be more productive with i18n

## Configuration 

You can add a configuration file with the name 'i18n-toolbox.json' : 

{
    "searchI18nFile": false,
    "i18nFolder": "src/assets/i18n",
    "defaultLanguage": "en"
}

If you don't add a configuration file, the default behavior is to search in the workspace for all files with the name *.i18n.json and take the first as [the default language](#the-default-language) else it searches files in the i18nFolder.

If there is no 'defaultLanguage' key, the default language is the first it finds.


## The default language 
If there are some missing key in another language, i18n take the translation in the default language.
