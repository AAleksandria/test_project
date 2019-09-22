#!flask/bin/python
# Для проверки в командной строке вводить HTTP запрос 
# curl -i -H "Content-Type: application/json; charset=utf-8" -X POST -d '{"currency": "RUB","value": 205}' http://localhost:5000/withdraw
# linux curl
# curl -i -H "Content-Type: application/json" -X POST -d "{'currency': 'RUB','value': 100,'quantity': 10}" http://localhost:5000/deposite
# win curl
# curl -i http://localhost:5000/index
# curl -i -H "Content-Type: application/json" -X POST -d "{"""currency""":"""RUB""", """value""": 100, """quantity""": 10}" http://localhost:5000/deposite



from flask import Flask, jsonify, abort, request, make_response
from collections import Counter

app = Flask(__name__, static_url_path = "")


@app.errorhandler(400)
def not_found(error):
    return make_response(jsonify( { 'error': 'Bad request' } ), 400)

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify( { 'error': 'Not found' } ), 404)


@app.errorhandler(406)
def not_found(error):
    return make_response(jsonify( { 'error': 'Not acceptable' } ), 406)


all_cash = {
    "RUB": [
        {"value": 5,"quantity": 0},
        {"value": 10,"quantity": 0},
        {"value": 50,"quantity": 1},
        {"value": 100,"quantity": 3},
        {"value": 200,"quantity": 0},
        {"value": 500,"quantity": 0},
        {"value": 1000,"quantity": 0},
        {"value": 2000,"quantity": 0},
        {"value": 5000,"quantity": 0}
    ],
    "EUR": [
        {"value": 5,"quantity": 0},
        {"value": 10,"quantity": 0},
        {"value": 20,"quantity": 0},
        {"value": 50,"quantity": 0},
        {"value": 100,"quantity": 0},
        {"value": 200,"quantity": 0},
        {"value": 500,"quantity": 0}
    ],
    "USD": [
        {"value": 1,"quantity": 0},
        {"value": 2,"quantity": 0},
        {"value": 5,"quantity": 0},
        {"value": 10,"quantity": 0},
        {"value": 50,"quantity": 0},
        {"value": 100,"quantity": 3}
    ]
}

@app.route('/index', methods = ['GET'])
def print_cash():
    all_cash2 = []
    for cur in all_cash:
        for val in all_cash[cur]:
            if val['quantity'] != 0:
                cash = {}
                cash['value'] = val['value']    
                cash['quantity'] = val['quantity']
                cash['currency'] = cur   
                all_cash2.append(cash)
    return jsonify({'all_cash': all_cash2})


@app.route('/deposite', methods = ['POST'])
def create_deposite():
    if not request.json or (not 'currency' in request.json or
                            not 'value' in request.json or
                            not 'quantity' in request.json):
        abort(400)

    for cur in all_cash: 
        if cur == request.json['currency']:
            for val in all_cash[cur]:
                if val['value'] == request.json['value']:
                    val['quantity'] += request.json['quantity']
    return jsonify( { "success": True } )

@app.route('/withdraw', methods = ['POST'])
def get_cash():
    if not request.json or (not 'currency' in request.json or
                            not 'amount' in request.json):
        abort(406)
    
    result = []

    for cur in all_cash: 
        if cur == request.json['currency']:

            req = request.json['amount']
            new_qua = request.json['amount']
            if sum([x['quantity'] for x in all_cash[cur]]) != 0 and \
            sum([x['quantity'] * x['value'] for x in all_cash[cur] if x['quantity'] != 0]) >= req:

                while new_qua != 0:
                    for val in list(reversed(all_cash[cur])):

                        new_qua = req - val['value']
                        quantity = 0
                        all_val = [x['value'] for x in all_cash[cur]] 

                        if new_qua >= 0 and val['quantity'] != 0:

                            if not (new_qua in all_val) and (new_qua) < min(all_val) and new_qua != 0: 
                                abort(406)

                            quantity += 1
                            result.append(val['value'])
                            req = new_qua
                            val['quantity'] -= 1 

                            break
                    else:
                        if new_qua >= 0 and val['quantity'] == 0:
                                abort(406)

            else:
                abort(406)
            new_result = Counter(result)
            new_result = [ {"value": x, "quantity": new_result[x]} for x in dict(new_result).keys()]



    return jsonify( {  "success": True ,"result": new_result} )
    

@app.route('/remove', methods = ['GET'])
def remove_cash():
    for cur in all_cash:
        for val in all_cash[cur]:
            if val['quantity'] != 0:
                val['quantity'] = 0
    return jsonify( { 'result': True, "all_cash:": all_cash } )
    
if __name__ == '__main__':
    app.run(debug=True)
