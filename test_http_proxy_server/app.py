#!flask/bin/python
"""
        Что необходимо сделать:
        + форма для отправки my_path
        + принять my_path и сделать редирект 
            на путь localhost:5000/path/my_path
        + делать request на ссылку хабра
        + сохранять html и выводить
        + изменять весь текст с 6 буквами добавляя символ ™
        + чтобы открывало путь не localhost,
            а http://localhost:5000/ru/company/yandex/blog/258673/
        + исправить неправильную замену, в конце ищет и заменяет даже скрипты
            (изменил регулярку)
        + не отображает html из-за jinja и выражения {{}} в тексте
        + при переходе по ссылкам открывать на localhost
            поиск в body всех ссылок с https://habr.com 
            в теге <a> аттрибуте href,
            замена на http://localhost:5000
        + изменить форму (привести в нормальный вид)
"""
import re
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify,request, redirect, \
                  make_response, render_template

app = Flask(__name__)

@app.errorhandler(400)
def not_found(error):
    return make_response(jsonify( { 'error': 'Bad request' } ),400)

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify( { 'error': 'Not found' } ),404)

@app.errorhandler(406)
def not_found(error):
    return make_response(jsonify( { 'error': 'Not acceptable' } ),406)

# меняет ссылку убирая наименование сайта
def path_url(url):
    print("====" * 8)
    url = re.sub(r"http(s?)\://.*?/", "", url)
    print("URL: ", url)
    print("PAGE: {} ".format("http://localhost:5000/" + url))
    return str(url)


# меняет ссылки с хабром в теге body на localhost
def replace_habr_href_in_body(body):
    for a in body.find_all(
        'a', href = re.compile(r"^http(s?)\://habr.com/\w+")
        ):

        a["href"] = re.sub(
            r"http(s?)\://habr.com/\w+",
            "http://localhost:5000",
            a["href"]
            )
    return body


@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        g_path = request.form.get('path')
        path = path_url(g_path)
        print("!====!Return in index!====!")
        return redirect("http://localhost:5000/" + str(path))
    else:
        return render_template('index.html')


@app.route('/<path:path_html>')
def path(path_html):
    habr_path = "https://habr.com/"+path_html
    print("+++++HABR_PATH+++++: ", habr_path)

    page = requests.get(habr_path)
    print("!====!Get Habr_Page!====!")

    page = BeautifulSoup(page.text.encode('utf-8'), "html.parser")
    body_without_scripts = page.body
    scripts = []
    for x in body_without_scripts.find_all("script"):
        scripts.append(x.extract())

    # поиск слова с 6 буквами во всех словах body_without_scripts
    new_rows = [
        re.sub("[^\w]", "", word) \
        for word in re.findall(r"\s\b\w{6}\b", body_without_scripts.get_text())
        ]
    myList = sorted(set(new_rows))
    print("!====!Write Word_List!====!")

    # замена слов в body_without_scripts
    for word_in_list in myList:
        # print(word_in_list)
        body_without_scripts = re.sub(
            r"\s\b" + word_in_list + r"\b", 
            " " + word_in_list + "™", 
            str(body_without_scripts)
            )
    

    print("!====!Replace Word_in_Body!====!")

    my_html = BeautifulSoup(body_without_scripts, 'html.parser')
    # добавляю скрипты в изменёный тег body
    for script in scripts:
        my_html.append(script)
    print("!====!Append Script!====!")

    my_html = replace_habr_href_in_body(my_html)
    body_page = str(page.body)
    page_html = str(page).replace(body_page, str(my_html))
    print("!====!Page_Html_is_Done!====!")
    return page_html


if __name__ == '__main__':
    app.run(debug=True)
