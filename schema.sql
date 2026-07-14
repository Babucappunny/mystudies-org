DROP TABLE IF EXISTS "MasterData";
CREATE TABLE "MasterData" (
    "Id" INTEGER,
    "Syllabus" TEXT,
    "Grade" INTEGER,
    "Language" TEXT,
    "Subject" TEXT,
    "Book#" INTEGER,
    "Chapter#" TEXT,
    "Type" TEXT,
    "Chapter" TEXT,
    "ChapterId" INTEGER
);

DROP TABLE IF EXISTS "Kerala_9_English_Book1_MCQ";
CREATE TABLE "Kerala_9_English_Book1_MCQ" (
    "Id" INTEGER,
    "Syllabus" TEXT,
    "Grade" INTEGER,
    "Language" TEXT,
    "Subject" TEXT,
    "Type" TEXT,
    "Book#" INTEGER,
    "Chapter#" INTEGER,
    "Chapter" TEXT,
    "ChapterId" INTEGER,
    "Section" TEXT,
    "Question" TEXT,
    "OptionA" TEXT,
    "OptionB" TEXT,
    "OptionC" TEXT,
    "OptionD" TEXT,
    "Correct" TEXT,
    "Difficulty" INT,
    "Correct#" INT,
    "Incorrect#" INT,
    "DifficultyNew" INT
);

CREATE INDEX IF NOT EXISTS idx_mcq_chapterid ON "Kerala_9_English_Book1_MCQ" ("ChapterId");
CREATE INDEX IF NOT EXISTS idx_mcq_section ON "Kerala_9_English_Book1_MCQ" ("ChapterId", "Section");
CREATE INDEX IF NOT EXISTS idx_master_lookup ON "MasterData" ("Syllabus","Grade","Language","Subject","Book#","Chapter#","Type");
