// Mock data for the Keen prototype. Every person, plan and review here is invented.
// Dates are relative to "now" so the demo stays coherent whenever it is opened.

const CATEGORIES = {
  racquet: 'Racquet sports', team: 'Team sports', fitness: 'Fitness', water: 'Water',
  outdoors: 'Outdoors', local: 'Local knowledge', games: 'Games', language: 'Languages',
  music: 'Music', creative: 'Creative', service: 'Home help',
};

// Canonical activity tags. `words` are the synonyms the parser maps onto the tag
// ("soccer" and "football" both become football). `size` is the usual group size.
// `group` follows the three tag families from the notebook: Sports, Hobbies, Professional skills.
const ACTIVITIES = [
  { id: 'padel', label: 'Padel', cat: 'racquet', group: 'Sports', size: 4, words: ['padel', 'paddle tennis', 'padel tennis', 'paddle'] },
  { id: 'tennis', label: 'Tennis', cat: 'racquet', group: 'Sports', size: 2, words: ['tennis'] },
  { id: 'pickleball', label: 'Pickleball', cat: 'racquet', group: 'Sports', size: 4, words: ['pickleball', 'pickle ball'] },
  { id: 'squash', label: 'Squash', cat: 'racquet', group: 'Sports', size: 2, words: ['squash'] },
  { id: 'football', label: 'Football', cat: 'team', group: 'Sports', size: 10, words: ['football', 'soccer', 'futsal', 'five a side', '5-a-side', '5 a side', '6-a-side', 'kickabout', 'kick about'], traits: ['contact'] },
  { id: 'basketball', label: 'Basketball', cat: 'team', group: 'Sports', size: 6, words: ['basketball', 'hoops'], traits: ['contact'] },
  { id: 'volleyball', label: 'Beach volleyball', cat: 'team', group: 'Sports', size: 4, words: ['beach volleyball', 'volleyball', 'beach volley'] },
  { id: 'running', label: 'Running', cat: 'fitness', group: 'Sports', size: 2, words: ['running', 'run', 'jog', 'jogging', 'parkrun', '5k', '10k'] },
  { id: 'cycling', label: 'Cycling', cat: 'fitness', group: 'Sports', size: 4, words: ['cycling', 'bike ride', 'road ride', 'ride', 'mtb'] },
  { id: 'climbing', label: 'Bouldering', cat: 'fitness', group: 'Sports', size: 2, words: ['bouldering', 'climbing', 'climb'], traits: ['heights'] },
  { id: 'surfing', label: 'Surfing', cat: 'water', group: 'Sports', size: 2, words: ['surfing', 'surf'], traits: ['water'] },
  { id: 'swimming', label: 'Ocean swim', cat: 'water', group: 'Sports', size: 4, words: ['ocean swim', 'swimming', 'swim'], traits: ['water'] },
  { id: 'hiking', label: 'Bushwalk', cat: 'outdoors', group: 'Hobbies', size: 4, words: ['bushwalk', 'bush walk', 'hiking', 'hike', 'coastal walk', 'walk'] },
  { id: 'explore', label: 'Local tour', cat: 'local', group: 'Hobbies', size: 2, words: ['show me around', 'show us around', 'explore', 'tour'] },
  { id: 'boardgames', label: 'Board games', cat: 'games', group: 'Hobbies', size: 4, words: ['board games', 'board game', 'boardgames', 'catan'] },
  { id: 'chess', label: 'Chess', cat: 'games', group: 'Hobbies', size: 2, words: ['chess'] },
  { id: 'photowalk', label: 'Photo walk', cat: 'creative', group: 'Hobbies', size: 4, words: ['photo walk', 'photography', 'photos'] },
  { id: 'jam', label: 'Music jam', cat: 'music', group: 'Hobbies', size: 4, words: ['jam session', 'jam', 'guitar'] },
  { id: 'language', label: 'Language exchange', cat: 'language', group: 'Professional skills', size: 2, words: ['language exchange', 'practise spanish', 'practice spanish', 'spanish', 'italian', 'japanese', 'french'] },
  { id: 'diy', label: 'Home fix-it', cat: 'service', group: 'Professional skills', size: 2, words: ['fix sink', 'fix my sink', 'fix the sink', 'plumbing', 'plumber', 'handyman', 'fix my', 'assemble', 'diy'] },
];

// Suburbs with approximate centroids. Only suburbs are ever shown to other users.
const PLACES = [
  { name: 'Manly', lat: -33.7969, lng: 151.2850 },
  { name: 'Balgowlah', lat: -33.7940, lng: 151.2640 },
  { name: 'Freshwater', lat: -33.7780, lng: 151.2880 },
  { name: 'Dee Why', lat: -33.7520, lng: 151.2880 },
  { name: 'Mosman', lat: -33.8290, lng: 151.2440 },
  { name: 'Neutral Bay', lat: -33.8320, lng: 151.2190 },
  { name: 'Chatswood', lat: -33.7970, lng: 151.1830 },
  { name: 'Sydney CBD', lat: -33.8688, lng: 151.2093, alias: ['cbd', 'the city'] },
  { name: 'Surry Hills', lat: -33.8880, lng: 151.2110 },
  { name: 'Newtown', lat: -33.8970, lng: 151.1790 },
  { name: 'Marrickville', lat: -33.9110, lng: 151.1550 },
  { name: 'Bondi', lat: -33.8910, lng: 151.2740 },
  { name: 'Bronte', lat: -33.9030, lng: 151.2680 },
  { name: 'Coogee', lat: -33.9200, lng: 151.2570 },
  { name: 'Parramatta', lat: -33.8150, lng: 151.0010 },
];

// Things people can ask not to be suggested. Kept private; used only to filter.
const AVOIDS = [
  { id: 'water', label: 'Water sports', words: ['water', 'swim', 'swimming', 'ocean', 'surf', 'surfing', 'sea', 'drown'] },
  { id: 'heights', label: 'Heights', words: ['height', 'heights', 'climb', 'climbing', 'cliff', 'cliffs'] },
  { id: 'alcohol', label: 'Alcohol and bars', words: ['alcohol', 'drink', 'drinks', 'drinking', 'booze', 'pub', 'pubs', 'bar', 'bars', 'sober', 'beer'] },
  { id: 'contact', label: 'Contact sports', words: ['contact', 'tackle', 'tackling', 'rough', 'physical'] },
  { id: 'late', label: 'Late nights', words: ['late', 'late nights', 'night', 'nights'] },
  { id: 'early', label: 'Early starts', words: ['early', 'early mornings', 'early starts', 'sunrise'] },
  { id: 'big', label: 'Big groups', words: ['big groups', 'big group', 'crowds', 'crowd', 'large groups'] },
];

const GOALS = [
  { id: 'fitness', label: 'Get fitter', words: ['fit', 'fitter', 'fitness', 'healthy', 'health', 'exercise', 'in shape', 'lose weight', 'active'] },
  { id: 'friends', label: 'Make new friends', words: ['friends', 'friend', 'people', 'social', 'meet', 'meeting', 'new to', 'community', 'lonely', 'mates'] },
  { id: 'learn', label: 'Learn something new', words: ['learn', 'learning', 'new skill', 'try', 'trying', 'improve', 'get better', 'teach'] },
  { id: 'compete', label: 'Compete', words: ['compete', 'competitive', 'competition', 'win', 'tournament', 'league', 'serious'] },
  { id: 'outdoors', label: 'Get outdoors', words: ['outdoors', 'outside', 'nature', 'fresh air', 'beach', 'sun'] },
  { id: 'unwind', label: 'Unwind', words: ['relax', 'unwind', 'stress', 'switch off', 'fun', 'chill', 'de-stress'] },
];

const AVAILABILITY = [
  { id: 'wd-am', label: 'Weekday mornings' },
  { id: 'wd-pm', label: 'Weekday evenings' },
  { id: 'we-am', label: 'Weekend mornings' },
  { id: 'we-pm', label: 'Weekend afternoons' },
];

// Public places plans can happen at. No home addresses, ever.
const VENUES = [
  { name: 'Manly Oval', suburb: 'Manly', acts: ['football', 'running'] },
  { name: 'Manly padel courts', suburb: 'Manly', acts: ['padel', 'pickleball'] },
  { name: 'Freshwater courts', suburb: 'Freshwater', acts: ['padel', 'tennis', 'pickleball'] },
  { name: 'Balgowlah tennis centre', suburb: 'Balgowlah', acts: ['tennis', 'squash'] },
  { name: 'South Steyne, by the lifeguard tower', suburb: 'Manly', acts: ['surfing', 'volleyball', 'swimming'] },
  { name: 'Shelly Beach', suburb: 'Manly', acts: ['swimming', 'photowalk'] },
  { name: 'Manly Wharf', suburb: 'Manly', acts: ['running', 'cycling', 'hiking', 'explore', 'photowalk'] },
  { name: 'Manly Dam picnic area', suburb: 'Balgowlah', acts: ['hiking', 'cycling', 'running'] },
  { name: 'Manly Library meeting room', suburb: 'Manly', acts: ['boardgames', 'chess', 'language'] },
  { name: 'Corso café tables', suburb: 'Manly', acts: ['boardgames', 'chess', 'language', 'jam'] },
  { name: 'Wharf bar (licensed)', suburb: 'Manly', acts: ['boardgames', 'jam'], alcohol: true },
  { name: 'Dee Why beach nets', suburb: 'Dee Why', acts: ['volleyball'] },
  { name: 'Clontarf Reserve', suburb: 'Mosman', acts: ['football', 'explore', 'hiking'] },
];

// Friends who come along with the user ("we're two"). They join plans with the user.
const FRIENDS = [
  { id: 'f1', name: 'Jordan', suburb: 'Manly', hue: 270, points: 410, events: 15, rating: 4.8, idVerified: true, phoneVerified: true, joined: 'Mar 2026', interests: ['padel', 'running'], skill: 'casual', noShows: 0 },
  { id: 'f2', name: 'Priyanka', suburb: 'Manly', hue: 40, points: 220, events: 8, rating: 4.9, idVerified: false, phoneVerified: true, joined: 'May 2026', interests: ['padel', 'football'], skill: 'casual', noShows: 0 },
  { id: 'f3', name: 'Tim', suburb: 'Balgowlah', hue: 120, points: 150, events: 6, rating: 4.7, idVerified: false, phoneVerified: true, joined: 'Jun 2026', interests: ['football'], skill: 'casual', noShows: 0 },
];

// The signed-in user. Login is out of scope; onboarding (the chat) can overwrite this sample profile.
const ME = {
  id: 'me', name: 'Sam', suburb: 'Manly', hue: 196, points: 640, events: 17, rating: 4.8,
  idVerified: false, phoneVerified: true, joined: 'Feb 2026', noShows: 0, skill: 'casual',
  interests: ['padel', 'surfing', 'running', 'boardgames', 'language'],
  levels: { padel: 'casual', surfing: 'beginner', running: 'intermediate', boardgames: 'casual', language: 'beginner' },
  radius: 10, age: 34, goals: ['friends', 'fitness'], avoid: ['alcohol'], free: ['wd-pm', 'we-am'],
};

// [id, first name, suburb, avatar hue, goodwill, events attended, rating, ID verified, joined, interests, skill, bio, no-shows]
const PEOPLE_ROWS = [
  ['p1', 'Mia', 'Manly', 12, 1240, 48, 4.9, true, 'Mar 2025', ['padel', 'surfing', 'running'], 'casual', 'Usually on court before work. Happy to rotate partners.', 0],
  ['p2', 'Tom', 'Balgowlah', 210, 520, 21, 4.7, true, 'Aug 2025', ['padel', 'tennis', 'cycling'], 'intermediate', 'Play doubles with my partner Jess most weekends.', 0],
  ['p3', 'Priya', 'Mosman', 330, 310, 12, 4.8, false, 'Jan 2026', ['tennis', 'padel', 'hiking'], 'intermediate', 'Moved from Melbourne last year, still finding my people.', 0],
  ['p4', 'Luca', 'Manly', 140, 1820, 73, 4.9, true, 'Nov 2024', ['football', 'running', 'swimming'], 'casual', 'Run the Friday 6-a-side. All levels, just turn up on time.', 0],
  ['p5', 'Hannah', 'Dee Why', 280, 95, 3, 4.6, false, 'Sep 2026', ['padel', 'pickleball'], 'beginner', 'New to padel, very keen to improve.', 0],
  ['p6', 'Kai', 'Manly', 185, 2310, 96, 5.0, true, 'Jun 2024', ['surfing', 'swimming', 'volleyball'], 'competitive', 'Surf coach on weekdays. Weekends I help beginners for free.', 0],
  ['p7', 'Ben', 'Freshwater', 40, 760, 30, 4.6, true, 'Feb 2025', ['football', 'basketball'], 'casual', 'Left foot only.', 1],
  ['p8', 'Zoe', 'Freshwater', 300, 180, 7, 4.8, false, 'Jul 2026', ['surfing', 'photowalk'], 'beginner', 'Still falling off the board. Would love a surf buddy.', 0],
  ['p9', 'Omar', 'Balgowlah', 95, 640, 26, 4.7, true, 'Apr 2025', ['football', 'running'], 'casual', 'Bring cones to everything.', 0],
  ['p10', 'Grace', 'Manly', 350, 980, 41, 4.9, true, 'Jan 2025', ['running', 'swimming'], 'intermediate', 'Corso to Shelly and back, most mornings.', 0],
  ['p11', 'Ravi', 'Balgowlah', 25, 430, 18, 4.5, false, 'Oct 2025', ['running', 'cycling'], 'casual', 'Training for my first half marathon.', 0],
  ['p12', 'Jack', 'Manly', 160, 300, 11, 4.4, true, 'Mar 2026', ['football', 'squash'], 'competitive', 'Played state league years ago.', 2],
  ['p13', 'Sofia', 'Freshwater', 5, 520, 19, 4.8, true, 'Dec 2025', ['football', 'volleyball'], 'intermediate', 'Looking for a regular mixed game.', 0],
  ['p14', 'Noah', 'Manly', 230, 270, 9, 4.7, false, 'May 2026', ['volleyball', 'surfing'], 'casual', 'Me and my brother play most Sundays.', 0],
  ['p15', 'Emma', 'Neutral Bay', 320, 690, 28, 4.9, true, 'Jul 2025', ['tennis', 'pickleball'], 'intermediate', 'Weeknight hitter, 3.5 level-ish.', 0],
  ['p16', 'Leo', 'Surry Hills', 60, 410, 16, 4.8, false, 'Nov 2025', ['boardgames', 'chess'], 'casual', 'Owner of far too many board games.', 0],
  ['p17', 'Margaret', 'Mosman', 110, 1510, 52, 5.0, true, 'Feb 2024', ['explore', 'hiking', 'photowalk'], 'casual', 'Lived in Mosman 20 years. Love showing people the harbour walks.', 0],
  ['p18', 'Diego', 'Sydney CBD', 20, 220, 8, 4.6, false, 'Jun 2026', ['language', 'football'], 'casual', 'Native Spanish speaker, learning Japanese.', 0],
  ['p19', 'Aiko', 'Marrickville', 340, 580, 22, 4.8, true, 'Sep 2025', ['climbing', 'language'], 'intermediate', 'V3-V4 on a good day.', 0],
  ['p20', 'Chris', 'Mosman', 200, 350, 14, 4.5, false, 'Apr 2026', ['pickleball', 'tennis'], 'casual', 'Converted tennis player.', 0],
  ['p21', 'Ella', 'Mosman', 290, 870, 34, 4.8, true, 'Mar 2025', ['padel', 'tennis'], 'competitive', 'Looking for strong doubles games.', 0],
  ['p22', 'Finn', 'Manly', 130, 150, 5, 4.9, false, 'Aug 2026', ['hiking', 'running'], 'casual', 'Weekend walker, slow pace, many snack stops.', 0],
  ['p23', 'Isla', 'Manly', 15, 1100, 44, 4.9, true, 'Dec 2024', ['padel', 'pickleball', 'running'], 'casual', 'Book the courts, bring the balls.', 0],
  ['p24', 'Marco', 'Balgowlah', 75, 460, 17, 4.7, true, 'Oct 2025', ['padel', 'football'], 'casual', 'Padel twice a week, football when my knee lets me.', 0],
  ['p25', 'Ruby', 'Manly', 345, 60, 2, 5.0, false, 'Sep 2026', ['surfing', 'swimming'], 'beginner', 'Learning to surf this summer.', 0],
  ['p26', 'Sam B', 'Dee Why', 180, 240, 10, 4.6, false, 'May 2026', ['padel', 'running', 'surfing'], 'casual', 'Early riser.', 0],
  ['p27', 'Ana', 'Balgowlah', 250, 400, 15, 4.8, true, 'Feb 2026', ['padel', 'language'], 'casual', 'Portuguese and Spanish speaker.', 0],
  ['p28', 'Josh', 'Manly', 100, 120, 4, 4.5, false, 'Jul 2026', ['padel', 'basketball'], 'beginner', 'Only played padel twice.', 0],
  ['p29', 'Olivia', 'Freshwater', 310, 530, 20, 4.9, true, 'Nov 2025', ['padel', 'hiking', 'boardgames'], 'casual', 'Happy to make up numbers.', 0],
  ['p30', 'Will', 'Bondi', 205, 690, 27, 4.7, true, 'Jan 2025', ['volleyball', 'surfing', 'padel'], 'intermediate', 'Bondi local, beach most days.', 0],
];

const PEOPLE = PEOPLE_ROWS.map(([id, name, suburb, hue, points, events, rating, idVerified, joined, interests, skill, bio, noShows]) => ({
  id, name, suburb, hue, points, events, rating, idVerified, phoneVerified: true, joined, interests, skill, bio, noShows,
}));

const REVIEW_BANK = [
  { text: 'Turned up early and sorted the court booking.', tags: ['On time', 'Organised'] },
  { text: 'Friendly, good sport, would play again.', tags: ['Friendly', 'Would play again'] },
  { text: 'Level was exactly as described.', tags: ['Skill as described'] },
  { text: 'Made the new people feel welcome.', tags: ['Friendly', 'Welcoming'] },
  { text: 'Great energy, kept the game moving.', tags: ['Good sport'] },
  { text: 'Brought spare gear for everyone.', tags: ['Organised'] },
];

// Open asks from other people: what they said, mapped to the same graph shape as ours.
// `when` is [day, fromHour, toHour]. Day is a weekday ('sat') or an offset from today ('+3', '-9').
const OPEN_ASKS = [
  { who: 'p1', act: 'padel', place: 'Manly', when: ['sat', 7, 10], have: 1, seek: 3, skill: 'casual', text: 'Padel Saturday morning, social level, anyone keen?' },
  { who: 'p2', act: 'padel', place: 'Balgowlah', when: ['sat', 8, 11], have: 2, seek: 2, skill: 'intermediate', text: 'Me and my partner need two for doubles.' },
  { who: 'p27', act: 'padel', place: 'Balgowlah', when: ['sat', 7, 9], have: 1, seek: 3, skill: 'casual', text: 'Early padel before the beach?' },
  { who: 'p3', act: 'tennis', place: 'Mosman', when: ['sat', 9, 11], have: 1, seek: 1, skill: 'intermediate', text: 'Tennis hit Saturday, then coffee.' },
  { who: 'p5', act: 'padel', place: 'Dee Why', when: ['sun', 16, 18], have: 1, seek: 3, skill: 'beginner', text: 'Beginner padel, Sunday arvo.' },
  { who: 'p21', act: 'padel', place: 'Mosman', when: ['sat', 9, 11], have: 1, seek: 3, skill: 'competitive', text: 'Competitive doubles, 4.0+ please.' },
  { who: 'p6', act: 'surfing', role: 'teacher', place: 'Manly', when: ['sat', 6, 9], have: 1, seek: 3, skill: 'competitive', text: 'Happy to show beginners the basics at South Steyne.' },
  { who: 'p8', act: 'surfing', place: 'Freshwater', when: ['sat', 6, 8], have: 1, seek: 1, skill: 'beginner', text: 'Still learning, want a surf buddy.' },
  { who: 'p10', act: 'running', place: 'Manly', when: ['tue', 6, 7.5], have: 1, seek: 2, skill: 'intermediate', text: 'Corso to Shelly and back before work.' },
  { who: 'p11', act: 'running', place: 'Balgowlah', when: ['thu', 6, 7], have: 1, seek: 1, skill: 'casual', text: 'Easy 5k, chatting pace.' },
  { who: 'p13', act: 'football', place: 'Freshwater', when: ['fri', 18, 20], have: 1, seek: 9, skill: 'intermediate', text: 'Anyone got a Friday game going?' },
  { who: 'p14', act: 'volleyball', place: 'Manly', when: ['sun', 15, 18], have: 2, seek: 2, skill: 'casual', text: 'Me and my brother need two for beach volley.' },
  { who: 'p15', act: 'tennis', place: 'Neutral Bay', when: ['wed', 18, 20], have: 1, seek: 1, skill: 'intermediate', text: 'Weeknight tennis after work.' },
  { who: 'p16', act: 'boardgames', place: 'Surry Hills', when: ['+3', 19, 22], have: 1, seek: 3, skill: 'casual', text: 'Catan night, I have snacks.' },
  { who: 'p17', act: 'explore', role: 'teacher', place: 'Mosman', when: ['sat', 10, 13], have: 1, seek: 2, skill: 'casual', text: 'Happy to show someone the harbour walks.' },
  { who: 'p18', act: 'language', place: 'Sydney CBD', when: ['wed', 12, 13], have: 1, seek: 1, skill: 'casual', text: 'Spanish for Japanese exchange, lunch break.' },
  { who: 'p19', act: 'climbing', place: 'Marrickville', when: ['thu', 18, 21], have: 1, seek: 1, skill: 'intermediate', text: 'Bouldering partner, Thursday nights.' },
  { who: 'p20', act: 'pickleball', place: 'Mosman', when: ['sun', 9, 11], have: 1, seek: 3, skill: 'casual', text: 'Pickleball Sunday morning.' },
  { who: 'p22', act: 'hiking', place: 'Manly', when: ['sun', 8, 12], have: 1, seek: 3, skill: 'casual', text: 'Manly to Spit walk, slow pace.' },
];

// Group plans: someone already has people and is looking for more.
const PLANS = [
  { id: 'g1', org: 'p4', act: 'football', title: 'Friday 6-a-side', place: 'Manly', venue: 'Manly Oval, north end', when: ['fri', 18, 19.5], members: ['p4', 'p7', 'p9', 'p12'], size: 11, skill: 'casual', note: 'Bibs and ball sorted. Looking for 7 more.' },
  { id: 'g2', org: 'p23', act: 'padel', title: 'Sunday social padel', place: 'Manly', venue: 'Manly padel courts, court 2', when: ['sun', 8, 10], members: ['p23', 'p24'], size: 4, skill: 'casual', note: 'Court booked. Need two more for doubles.' },
  { id: 'g3', org: 'p6', act: 'surfing', title: 'Learn-to-surf meetup', place: 'Manly', venue: 'South Steyne, by the lifeguard tower', when: ['sat', 7, 9], members: ['p6', 'p25'], size: 6, skill: 'beginner', note: 'Bring a soft-top if you have one. I have two spares.' },
  { id: 'g4', org: 'p30', act: 'volleyball', title: 'Bondi beach volley', place: 'Bondi', venue: 'North Bondi nets', when: ['sun', 14, 17], members: ['p30'], size: 4, skill: 'intermediate', note: 'Net is up from 2pm.' },
  { id: 'g5', org: 'p29', act: 'padel', title: 'Saturday padel ladder', place: 'Freshwater', venue: 'Freshwater courts', when: ['sat', 8, 10], members: ['p29', 'p26', 'p28'], size: 4, skill: 'casual', note: 'One spot left.' },
  { id: 'g6', org: 'p10', act: 'running', title: 'Sunrise run', place: 'Manly', venue: 'Manly Wharf', when: ['sat', 6, 7], members: ['p10', 'p22', 'p11'], size: 12, skill: 'casual', note: '6km, no one gets left behind.' },
  { id: 'g7', org: 'p16', act: 'boardgames', title: 'Trivia and board games', place: 'Manly', venue: 'Wharf bar (licensed)', alcohol: true, when: ['+2', 19, 22], members: ['p16', 'p29', 'p27'], size: 8, skill: 'casual', note: 'Teams of four. Bring your worst general knowledge.' },
  { id: 'g8', org: 'p10', act: 'swimming', title: 'Shelly Beach swim', place: 'Manly', venue: 'Shelly Beach', when: ['sun', 7.5, 8.5], members: ['p10', 'p4'], size: 8, skill: 'intermediate', note: 'Out to the buoy and back. Wetsuits optional.' },
  { id: 'g9', org: 'p27', act: 'language', title: 'Spanish over coffee', place: 'Manly', venue: 'Corso café tables', when: ['wed', 7.5, 8.5], members: ['p27', 'p18'], size: 6, skill: 'beginner', note: 'Half Spanish, half English. All levels.' },
  { id: 'g10', org: 'p15', act: 'tennis', title: 'Social doubles', place: 'Mosman', venue: 'Clontarf Reserve courts', when: ['sun', 9, 11], members: ['p15', 'p3', 'p20'], size: 4, skill: 'intermediate', note: 'One spot. We rotate partners every set.' },
  { id: 'g11', org: 'p19', act: 'climbing', title: 'Sunset bouldering', place: 'Marrickville', venue: 'Marrickville climbing gym', when: ['thu', 18, 20.5], members: ['p19'], size: 4, skill: 'intermediate', note: 'Shoes for hire at the desk.' },
  { id: 'g12', org: 'p22', act: 'hiking', title: 'Manly Dam loop', place: 'Balgowlah', venue: 'Manly Dam picnic area', when: ['sun', 8, 11], members: ['p22', 'p17'], size: 8, skill: 'casual', note: 'Slow pace, snack stop halfway.' },
];

// A plan the user went to last week. It is waiting for their feedback.
const PAST_PLANS = [
  { id: 'past1', org: 'p4', act: 'football', title: 'Friday 6-a-side', place: 'Manly', venue: 'Manly Oval, north end', when: ['-fri', 18, 19.5], members: ['p4', 'p7', 'p9', 'p12', 'me'], size: 11, skill: 'casual', past: true },
];

// An ask the user saved earlier that nobody has matched yet.
const MY_ASKS = [
  { id: 'r1', text: 'Chess in the park, weekday lunch', summary: 'Chess · Manly 5 km · Weekdays 12–2pm', sent: 6, seen: 4, keen: 0, passed: 1, created: '2 days ago' },
];

const SEED_CHAT = {
  g1: [
    { who: 'p4', text: 'Bibs and a ball sorted. Meet at the north end by the nets.' },
    { who: 'p9', text: 'I can bring cones.' },
  ],
  g2: [{ who: 'p23', text: 'Court 2 is booked 8 to 10. Bring water, the fountain is broken.' }],
  g3: [{ who: 'p6', text: 'Flags go up at 7. We start on the sand with pop-ups.' }],
  past1: [
    { who: 'p4', text: 'Good game everyone. Same time next week?' },
    { who: 'p7', text: 'In.' },
  ],
};

if (typeof module !== 'undefined') {
  module.exports = { CATEGORIES, ACTIVITIES, AVOIDS, GOALS, AVAILABILITY, VENUES, FRIENDS, PLACES, ME, PEOPLE, REVIEW_BANK, OPEN_ASKS, PLANS, PAST_PLANS, MY_ASKS, SEED_CHAT };
}
