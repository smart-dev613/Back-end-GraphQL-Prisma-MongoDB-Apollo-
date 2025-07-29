import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();

export const addOrderNumberToPreQuestions = async () => {
  //const questionsCount = await prisma.communityQuestionsConnection().aggregate().count();

  //const questionIds = await prisma.communityQuestions().$fragment(`{ _id }`);

  const questions = await prisma.communityQuestions();
  //const questionIds = questions.filter(q => q._id);

  for (let i = questions.length; i > 0; i--) {
    const updateResult = await prisma.updateCommunityQuestion({
      data: {
        order: i,
      },
      where: {
        _id: questions[questions.length - i]._id,
      },
    });
    console.log(
      'Question order updated, order=' + (questions.length - i + 1) + ', id=',
      questions[questions.length - i]._id
    );
  }
};

addOrderNumberToPreQuestions();
