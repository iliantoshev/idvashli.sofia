// Събития от Netlify Identity.
// Когато потребител бъде изтрит (от сайта или от таблото на Netlify),
// изтриваме и всичките му данни в сайта: профил, селфи, записвания.
import { deleteUserData } from '../../lib/shared.mjs';

export default {
  async userDeleted(event) {
    if (event?.user?.id) await deleteUserData(event.user.id);
  },
};
