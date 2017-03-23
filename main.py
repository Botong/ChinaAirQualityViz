# Imports
import os
import jinja2
import webapp2
import logging
import MySQLdb

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

from flask import Flask
app = Flask(__name__)
app.config['DEBUG'] = True

# Note: We don't need to call run() since our application is embedded within
# the App Engine WSGI application server.
# _INSTANCE_NAME = 'bsui-byte3-db'
# _DB_NAME = 'mobiledb' # or whatever name you choose
# _PASSWD = '900716'
# _USER = 'root'
#
# if (os.getenv('SERVER_SOFTWARE') and
#     os.getenv('SERVER_SOFTWARE').startswith('Google App Engine/')):
#     _DB = MySQLdb.connect(unix_socket='/cloudsql/' + _INSTANCE_NAME, db=_DB_NAME, user=_USER, passwd=_PASSWD, charset='utf8')
# else:
#     _DB = MySQLdb.connect(host='207.223.170.28', port=3306, db=_DB_NAME, user=_USER, passwd=_PASSWD, charset='utf8')

@app.route('/')
def index():
    template = JINJA_ENVIRONMENT.get_template('templates/index.html')
    # cursor = _DB.cursor()
    # cursor.execute('SHOW TABLES')
    # logging.info(cursor.fetchall())
    return template.render()

@app.route('/table')
def table():
    template = JINJA_ENVIRONMENT.get_template('templates/table.html')
    return template.render()

@app.route('/teamInfo')
def teamInfo():
    template = JINJA_ENVIRONMENT.get_template('templates/teamInfo.html')
    return template.render()


@app.errorhandler(404)
def page_not_found(e):
    """Return a custom 404 error."""
    return 'Sorry, nothing at this URL.', 404
