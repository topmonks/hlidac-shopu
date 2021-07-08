const userAgents = require("./USER-AGENTS");

class UserAgentDb {
  constructor(timesSeen = 100) {
    this.userAgents = userAgents.filter(
      ua => ua.user_agent_meta_data.times_seen >= timesSeen
    );
  }

  getRandom() {
    return this._pickRandom(this.userAgents).user_agent;
  }

  _pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

module.exports = UserAgentDb;
