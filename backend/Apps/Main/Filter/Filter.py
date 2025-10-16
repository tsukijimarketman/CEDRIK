from flask import current_app
from .FilterExtension import KEY
from .FilterService import FilterService

FILTER_ERR_MSG = [
  "🚫 Uh-oh! That message contains inappropriate language. Please try again politely. 🙂",
  "⚠️ Let's keep it friendly! Some words aren’t allowed here. 💬✨",
  "🙈 Oops! That word isn’t okay to use. Please be respectful. 🙏",
  "😅 Hey, watch your language! Let’s keep our chat clean and fun. 🌟",
  "🛑 Message blocked — please avoid using offensive words. 💡",
  "⚠️ Oops! Please keep the conversation respectful — that word isn’t allowed. 🙏"
]

def m_filter(v: str):
  service: FilterService = current_app.extensions[KEY]
  if not isinstance(service, FilterService):
    return None


  return service.filter(v)
