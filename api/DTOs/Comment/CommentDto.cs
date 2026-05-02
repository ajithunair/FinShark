using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace api.DTOs.Comment
{
    public class CommentDto
    {
        public int Id { get; set; }
        public string Title { get; set; }=string.Empty;
        public string Content { get; set; }=string.Empty;
        public DateTime CreatedOn { get; set; }=DateTime.UtcNow;
        public int? StockId { get; set; }

    }

    public class CreateCommentDto
    {
        [Required]
        [MinLength(5,ErrorMessage ="Title can not be less than 5 characters")]
        [MaxLength(280, ErrorMessage ="Title can not be over 280 characters")]
        public string Title { get; set; }=string.Empty;

        [Required]
        [MinLength(5,ErrorMessage ="Content can not be less than 5 characters")]
        [MaxLength(280, ErrorMessage ="Content can not be over 280 characters")]
        public string Content { get; set; }=string.Empty;
    }

    public class UpdateCommentRequestDto
    {
        [Required]
        [MinLength(5,ErrorMessage ="Title can not be less than 5 characters")]
        [MaxLength(280, ErrorMessage ="Title can not be over 280 characters")]
        public string Title { get; set; }=string.Empty;

        [Required]
        [MinLength(5,ErrorMessage ="Content can not be less than 5 characters")]
        [MaxLength(280, ErrorMessage ="Content can not be over 280 characters")]
        public string Content { get; set; }=string.Empty;
    }
}
