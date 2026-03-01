// Common Slack emoji shortcodes → Unicode
// Covers ~300 most-used emoji. Unknown codes stay as-is.
const EMOJI: Record<string, string> = {
  // Smileys
  grinning: "😀", smiley: "😃", smile: "😄", grin: "😁", laughing: "😆",
  satisfied: "😆", sweat_smile: "😅", rofl: "🤣", joy: "😂",
  slightly_smiling_face: "🙂", upside_down_face: "🙃", wink: "😉",
  blush: "😊", innocent: "😇", smiling_face_with_three_hearts: "🥰",
  heart_eyes: "😍", star_struck: "🤩", kissing_heart: "😘",
  kissing: "😗", kissing_closed_eyes: "😚", kissing_smiling_eyes: "😙",
  yum: "😋", stuck_out_tongue: "😛", stuck_out_tongue_winking_eye: "😜",
  zany_face: "🤪", stuck_out_tongue_closed_eyes: "😝", money_mouth_face: "🤑",
  hugs: "🤗", hand_over_mouth: "🤭", shushing_face: "🤫",
  thinking: "🤔", thinking_face: "🤔", zipper_mouth_face: "🤐",
  raised_eyebrow: "🤨", neutral_face: "😐", expressionless: "😑",
  no_mouth: "😶", smirk: "😏", unamused: "😒", roll_eyes: "🙄",
  grimacing: "😬", lying_face: "🤥", relieved: "😌", pensive: "😔",
  sleepy: "😪", drooling_face: "🤤", sleeping: "😴", mask: "😷",
  face_with_thermometer: "🤒", face_with_head_bandage: "🤕",
  nauseated_face: "🤢", sneezing_face: "🤧", hot_face: "🥵",
  cold_face: "🥶", woozy_face: "🥴", dizzy_face: "😵",
  exploding_head: "🤯", cowboy_hat_face: "🤠", partying_face: "🥳",
  sunglasses: "😎", nerd_face: "🤓", monocle_face: "🧐",
  confused: "😕", worried: "😟", slightly_frowning_face: "🙁",
  frowning_face: "☹️", open_mouth: "😮", hushed: "😯",
  astonished: "😲", flushed: "😳", pleading_face: "🥺",
  frowning: "😦", anguished: "😧", fearful: "😨", cold_sweat: "😰",
  disappointed_relieved: "😥", cry: "😢", sob: "😭",
  scream: "😱", confounded: "😖", persevere: "😣",
  disappointed: "😞", sweat: "😓", weary: "😩", tired_face: "😫",
  yawning_face: "🥱", triumph: "😤", rage: "😡", angry: "😠",
  skull: "💀", skull_and_crossbones: "☠️",
  // Gestures
  wave: "👋", raised_back_of_hand: "🤚", raised_hand: "✋",
  hand: "✋", vulcan_salute: "🖖", ok_hand: "👌",
  pinching_hand: "🤏", v: "✌️", crossed_fingers: "🤞",
  love_you_gesture: "🤟", metal: "🤘", call_me_hand: "🤙",
  point_left: "👈", point_right: "👉", point_up_2: "👆",
  point_down: "👇", point_up: "☝️",
  "+1": "👍", thumbsup: "👍", "-1": "👎", thumbsdown: "👎",
  fist: "✊", punch: "👊", facepunch: "👊",
  left_facing_fist: "🤛", right_facing_fist: "🤜",
  clap: "👏", raised_hands: "🙌", open_hands: "👐",
  palms_up_together: "🤲", handshake: "🤝", pray: "🙏",
  writing_hand: "✍️", muscle: "💪", leg: "🦵",
  // Hearts
  heart: "❤️", red_heart: "❤️", orange_heart: "🧡",
  yellow_heart: "💛", green_heart: "💚", blue_heart: "💙",
  purple_heart: "💜", black_heart: "🖤", white_heart: "🤍",
  brown_heart: "🤎", broken_heart: "💔", two_hearts: "💕",
  revolving_hearts: "💞", heartbeat: "💓", heartpulse: "💗",
  sparkling_heart: "💖", cupid: "💘", gift_heart: "💝",
  heart_decoration: "💟", heavy_heart_exclamation: "❣️",
  fire: "🔥", "100": "💯", sparkles: "✨", star: "⭐",
  star2: "🌟", dizzy: "💫", boom: "💥", collision: "💥",
  // Objects & symbols
  tada: "🎉", confetti_ball: "🎊", balloon: "🎈",
  birthday: "🎂", trophy: "🏆", medal_sports: "🏅",
  first_place_medal: "🥇", second_place_medal: "🥈", third_place_medal: "🥉",
  rocket: "🚀", airplane: "✈️", hourglass: "⌛",
  watch: "⌚", alarm_clock: "⏰", stopwatch: "⏱️",
  bulb: "💡", flashlight: "🔦", candle: "🕯️",
  money_with_wings: "💸", dollar: "💵", moneybag: "💰",
  chart_with_upwards_trend: "📈", chart_with_downwards_trend: "📉",
  email: "📧", envelope: "✉️", incoming_envelope: "📨",
  phone: "📱", computer: "💻", keyboard: "⌨️",
  desktop_computer: "🖥️", link: "🔗", lock: "🔒", unlock: "🔓",
  key: "🔑", hammer: "🔨", wrench: "🔧", gear: "⚙️",
  shield: "🛡️", bow_and_arrow: "🏹",
  // Checkmarks & status
  white_check_mark: "✅", heavy_check_mark: "✔️",
  ballot_box_with_check: "☑️", heavy_multiplication_x: "✖️",
  x: "❌", negative_squared_cross_mark: "❎",
  exclamation: "❗", heavy_exclamation_mark: "❗",
  question: "❓", grey_exclamation: "❕", grey_question: "❔",
  warning: "⚠️", rotating_light: "🚨",
  no_entry: "⛔", no_entry_sign: "🚫", octagonal_sign: "🛑",
  // Arrows
  arrow_right: "➡️", arrow_left: "⬅️", arrow_up: "⬆️", arrow_down: "⬇️",
  arrows_counterclockwise: "🔄", back: "🔙", end: "🔚",
  // Nature
  sun_with_face: "🌞", sunny: "☀️", cloud: "☁️",
  partly_sunny: "⛅", rainbow: "🌈", umbrella: "☂️",
  snowflake: "❄️", zap: "⚡", earth_americas: "🌎",
  rose: "🌹", sunflower: "🌻", four_leaf_clover: "🍀",
  evergreen_tree: "🌲", deciduous_tree: "🌳", palm_tree: "🌴",
  cactus: "🌵", cherry_blossom: "🌸",
  // Animals
  dog: "🐶", cat: "🐱", mouse: "🐭", hamster: "🐹",
  rabbit: "🐰", fox_face: "🦊", bear: "🐻", panda_face: "🐼",
  unicorn: "🦄", butterfly: "🦋", bug: "🐛", bee: "🐝",
  penguin: "🐧", chicken: "🐔", eagle: "🦅", owl: "🦉",
  snake: "🐍", turtle: "🐢", octopus: "🐙", whale: "🐳",
  dolphin: "🐬", fish: "🐟", shark: "🦈",
  // Food
  coffee: "☕", tea: "🍵", beer: "🍺", beers: "🍻",
  wine_glass: "🍷", cocktail: "🍸", tropical_drink: "🍹",
  pizza: "🍕", hamburger: "🍔", fries: "🍟", hotdog: "🌭",
  taco: "🌮", burrito: "🌯", popcorn: "🍿", doughnut: "🍩",
  cookie: "🍪", cake: "🍰", ice_cream: "🍨", apple: "🍎",
  banana: "🍌", watermelon: "🍉", grapes: "🍇", strawberry: "🍓",
  avocado: "🥑", corn: "🌽", carrot: "🥕", broccoli: "🥦",
  // People
  eyes: "👀", eye: "👁️", tongue: "👅", lips: "👄",
  brain: "🧠", baby: "👶", man: "👨", woman: "👩",
  older_man: "👴", older_woman: "👵",
  // Misc
  speech_balloon: "💬", thought_balloon: "💭",
  zzz: "💤", mega: "📣", loudspeaker: "📢",
  bell: "🔔", no_bell: "🔕",
  musical_note: "🎵", notes: "🎶",
  microphone: "🎤", headphones: "🎧",
  art: "🎨", camera: "📷", video_camera: "📹",
  movie_camera: "🎬", tv: "📺", radio: "📻",
  books: "📚", book: "📖", bookmark: "🔖",
  label: "🏷️", pencil2: "✏️", pen: "🖊️", memo: "📝",
  newspaper: "📰", calendar: "📅", date: "📅",
  pushpin: "📌", paperclip: "📎", scissors: "✂️",
  wastebasket: "🗑️", package: "📦", mailbox: "📫",
  raised_hand_with_fingers_splayed: "🖐️",
};

// Skin tone modifiers
const SKIN_TONES: Record<string, string> = {
  "skin-tone-2": "\u{1F3FB}", // light
  "skin-tone-3": "\u{1F3FC}", // medium-light
  "skin-tone-4": "\u{1F3FD}", // medium
  "skin-tone-5": "\u{1F3FE}", // medium-dark
  "skin-tone-6": "\u{1F3FF}", // dark
};

/**
 * Convert Slack-style :emoji_name: and :emoji::skin-tone-N: to Unicode.
 */
export function convertEmoji(text: string): string {
  // Handle :emoji::skin-tone-N: patterns
  return text.replace(
    /:([a-z0-9_+-]+):(?::([a-z0-9_-]+):)?/g,
    (_match, name: string, modifier?: string) => {
      const base = EMOJI[name];
      if (!base) return _match; // keep original if unknown

      if (modifier && SKIN_TONES[modifier]) {
        return base + SKIN_TONES[modifier];
      }
      return base;
    }
  );
}
