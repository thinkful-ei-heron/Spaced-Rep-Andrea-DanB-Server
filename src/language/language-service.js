'use strict';
const LanguageService = {
	getUsersLanguage(db, user_id) {
		return db
			.from('language')
			.select('language.id', 'language.name', 'language.user_id', 'language.head', 'language.total_score')
			.where('language.user_id', user_id)
			.first();
	},

	getLanguageWords(db, language_id) {
		return db
			.from('word')
			.select(
				'id',
				'language_id',
				'original',
				'translation',
				'next',
				'memory_value',
				'correct_count',
				'incorrect_count'
			)
			.where({ language_id });
	},

	getLanguageHead(db, id) {
		return db
			.from('language')
			.join('word', { 'language.head': 'word.id' })
			.select('original', 'correct_count', 'incorrect_count', 'total_score')
			.where('language.id', '=', id)
			.first();
	},

	async getNextWord(db, num, language_id) {
		const headId = await this.getHead(db, language_id);
		let head = await this.getNode(db, headId.head);

		let temp = head;
		for (let i = 0; i < num; i++) {
			if (temp.next === null) {
				break;
			} else {
				temp = await this.getNode(db, temp.next);
			}
		}

		await this.updateNextWord(db, head.id, temp.next, language_id); //sets head.next to temp.next

		await this.updateNextWord(db, temp.id, head.id, language_id); //sets temp.next to head

		await this.updateHead(db, language_id, head.next); //sets head
	},

	async handleCorrectCount(db, language_id, original) {
		const language = await this.getLanguage(db, language_id);

		const totalScore = language.total_score;
		await db.from('language').where({ id: language_id }).update({ total_score: totalScore + 1 });

		let word = await db.from('word').where({ original, language_id }).select('*').first();
		await db.from('word').where({ original, language_id }).update({
			correct_count: word.correct_count + 1,
			memory_value: word.memory_value * 2
		});

		await this.getNextWord(db, word.memory_value * 2, language_id);
		word = await db.from('word').where({ original, language_id }).select('*').first();

		const head = await this.getLanguageHead(db, language_id);

		return {
			original: word.original,
			translation: word.translation,
			wordCorrectCount: word.correct_count,
			wordIncorrectCount: word.incorrect_count,
			nextWord: head.original,
			totalScore: head.total_score
		};
	},

	async handleIncorrectCount(db, language_id, original) {
		let word = await db.from('word').where({ original, language_id }).select('*').first();

		await db
			.from('word')
			.where({ original, language_id })
			.update({ incorrect_count: word.incorrect_count + 1, memory_value: 1 });

		word = await db.from('word').where({ original, language_id }).select('*').first();

		await this.getNextWord(db, 1, language_id);

		const head = await this.getLanguageHead(db, language_id);

		return {
			original: word.original,
			translation: word.translation,
			wordCorrectCount: word.correct_count,
			wordIncorrectCount: word.incorrect_count,
			nextWord: head.original,
			totalScore: head.total_score
		};
	},

	getWordTranslation(db, original) {
		return db.from('word').select('translation').where({ original }).first();
	},

	getNode(db, id) {
		return db.from('word').select('*').where({ id }).first();
	},

	getHead(db, id) {
		return db.from('language').select('head').where({ id }).first();
	},

	updateHead(db, language_id, word_id) {
		return db.from('language').where({ id: language_id }).update({ head: word_id });
	},

	getLanguage(db, id) {
		return db.select('*').from('language').where({ id }).first();
	},

	getWord(db, id) {
		return db.select('*').from('word').where({ id }).first();
	},

	updateNextWord(db, id, next, language_id) {
		return db.from('word').where({ id, language_id }).update({ next });
	}
};

module.exports = LanguageService;
